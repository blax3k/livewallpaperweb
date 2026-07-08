import { useState, useEffect, useMemo } from 'react';
import './SimulatorPage.scss';
import { PageLayout, PageBody } from './components/PageLayout';
import { ApiError, rulesApi, ruleGroupsApi, flagsApi, flagGroupsApi, type RuleDefinition, type RuleGroup, type FlagDefinition, type FlagGroup } from './api';
import { SimulatorTopBar } from './SimulatorTopBar';
import { SimulatorRulesPanel, COMBO_CONDITION_TYPES } from './SimulatorRulesPanel';
import { SimulatorFlagsPanel } from './SimulatorFlagsPanel';
import { generateUniqueId as generateUniqueFlagId } from './SimulatorFlagModals';
import {
  generateUniqueId,
  FlagEditModal,
  RenameFlagModal,
  NewGroupModal,
  RenameGroupModal,
  RemoveFlagGuardedModal,
  RemoveGroupModal,
} from './SimulatorFlagModals';
import {
  RuleEditModal,
  emptyRule,
  RenameRuleModal,
  NewGroupModal as NewRuleGroupModal,
  RenameGroupModal as RenameRuleGroupModal,
  RemoveRuleGuardedModal,
  RemoveGroupModal as RemoveRuleGroupModal,
  type RuleUsageRef,
} from './SimulatorRuleModals';

interface SimulatorPageProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

export function SimulatorPage({ projectId, projectName, onBack }: SimulatorPageProps) {
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([]);
  const [flags, setFlags] = useState<FlagDefinition[]>([]);
  const [flagGroups, setFlagGroups] = useState<FlagGroup[]>([]);
  const [flagUsageCounts, setFlagUsageCounts] = useState<Record<string, { rules: number; scenes: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderBy, setOrderBy] = useState<'least_shown' | 'points'>('least_shown');
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [isNewRule, setIsNewRule] = useState(false);
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null);
  const [isNewFlag, setIsNewFlag] = useState(false);
  const [renamingFlag, setRenamingFlag] = useState<FlagDefinition | null>(null);
  const [removeFlagTarget, setRemoveFlagTarget] = useState<{ flag: FlagDefinition; usage: { scenes: string[]; rules: string[] } } | null>(null);
  const [newGroupContext, setNewGroupContext] = useState<{ forFlag?: FlagDefinition } | null>(null);
  const [newGroupError, setNewGroupError] = useState<string | null>(null);
  const [renamingGroup, setRenamingGroup] = useState<FlagGroup | null>(null);
  const [renameGroupError, setRenameGroupError] = useState<string | null>(null);
  const [removingGroup, setRemovingGroup] = useState<FlagGroup | null>(null);
  const [renamingRule, setRenamingRule] = useState<RuleDefinition | null>(null);
  const [removeRuleTarget, setRemoveRuleTarget] = useState<{ rule: RuleDefinition; usage: RuleUsageRef[] } | null>(null);
  const [newRuleGroupContext, setNewRuleGroupContext] = useState<{ forRule?: RuleDefinition } | null>(null);
  const [newRuleGroupError, setNewRuleGroupError] = useState<string | null>(null);
  const [renamingRuleGroup, setRenamingRuleGroup] = useState<RuleGroup | null>(null);
  const [renameRuleGroupError, setRenameRuleGroupError] = useState<string | null>(null);
  const [removingRuleGroup, setRemovingRuleGroup] = useState<RuleGroup | null>(null);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([rulesApi.list(projectId), ruleGroupsApi.list(projectId), flagsApi.list(projectId), flagGroupsApi.list(projectId), flagsApi.checkUsageCounts(projectId)])
      .then(([r, rg, f, g, u]) => { setRules(r); setRuleGroups(rg); setFlags(f); setFlagGroups(g); setFlagUsageCounts(u); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, [projectId]);

  const refreshFlagGroups = () => {
    flagGroupsApi.list(projectId).then(setFlagGroups).catch(err => setError(String(err)));
  };

  const refreshFlagUsageCounts = () => {
    flagsApi.checkUsageCounts(projectId).then(setFlagUsageCounts).catch(err => setError(String(err)));
  };

  const refreshRuleGroups = () => {
    ruleGroupsApi.list(projectId).then(setRuleGroups).catch(err => setError(String(err)));
  };

  const flagsById = useMemo(() => new Map(flags.map(f => [f.id, f])), [flags]);

  const chapters = useMemo(
    () => flags.filter(f => f.isChapter).sort((a, b) => (a.chapterOrder ?? 0) - (b.chapterOrder ?? 0)),
    [flags],
  );

  useEffect(() => {
    if (currentChapterId !== null && chapters.some(c => c.id === currentChapterId)) return;
    setCurrentChapterId(chapters.length > 0 ? chapters[0].id : null);
  }, [chapters, currentChapterId]);

  const handleNewChapter = () => {
    const existingIds = new Set(flags.map(f => f.id));
    const nextOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapterOrder ?? 0)) + 1 : 0;
    const newChapter: FlagDefinition = {
      id: generateUniqueFlagId(existingIds),
      name: `Chapter ${nextOrder + 1}`,
      defaultActive: false,
      isChapter: true,
      chapterOrder: nextOrder,
    };
    const next = [...flags, newChapter];
    setFlags(next);
    flagsApi.save(projectId, next)
      .then(() => { refreshFlagGroups(); refreshFlagUsageCounts(); })
      .catch(err => setError(String(err)));
  };

  const computeRuleUsage = (rule: RuleDefinition, allRules: RuleDefinition[]): RuleUsageRef[] => {
    const setFlagIds = [...new Set((rule.actions ?? []).map(a => a.flagId).filter((id): id is string => !!id))];
    const flagRefs: RuleUsageRef[] = setFlagIds.map(id => ({ type: 'FLAG', name: flagsById.get(id)?.name || id }));
    const comboRefs: RuleUsageRef[] = allRules
      .filter(r => r.id !== rule.id)
      .filter(r => (r.conditions ?? []).some(g => g.checks.some(c => COMBO_CONDITION_TYPES.has(c.type) && c.flagId && setFlagIds.includes(c.flagId))))
      .map(r => ({ type: 'COMBO', name: r.name || r.id }));
    return [...flagRefs, ...comboRefs];
  };

  const handleSaveRule = (updated: RuleDefinition) => {
    if (editingRuleIndex === null) return;
    const next = rules.map((r, i) => i === editingRuleIndex ? updated : r);
    setRules(next);
    setEditingRuleIndex(null);
    setIsNewRule(false);
    rulesApi.save(projectId, next).catch(err => setError(String(err)));
  };

  const handleNewRule = (presetGroup?: string) => {
    const existingIds = new Set(rules.map(r => r.id));
    const newRule: RuleDefinition = {
      ...emptyRule(),
      id: generateUniqueId(existingIds),
      ...(presetGroup ? { group: presetGroup } : {}),
    };
    setRules(prev => [...prev, newRule]);
    setIsNewRule(true);
    setEditingRuleIndex(rules.length);
  };

  const handleCancelEditRule = () => {
    if (isNewRule && editingRuleIndex !== null) {
      setRules(prev => prev.filter((_, i) => i !== editingRuleIndex));
    }
    setEditingRuleIndex(null);
    setIsNewRule(false);
  };

  const handleSaveRenameRule = (name: string) => {
    if (!renamingRule) return;
    const next = rules.map(r => r.id === renamingRule.id ? { ...r, name } : r);
    setRules(next);
    setRenamingRule(null);
    rulesApi.save(projectId, next).catch(err => setError(String(err)));
  };

  const handleMoveRule = (rule: RuleDefinition, groupName: string | undefined) => {
    const next = rules.map(r => r.id === rule.id ? { ...r, group: groupName } : r);
    setRules(next);
    rulesApi.save(projectId, next)
      .then(() => refreshRuleGroups())
      .catch(err => setError(String(err)));
  };

  const handleOpenNewRuleGroup = (forRule?: RuleDefinition) => {
    setNewRuleGroupError(null);
    setNewRuleGroupContext({ forRule });
  };

  const handleCreateRuleGroup = async (name: string) => {
    setNewRuleGroupError(null);
    try {
      const group = await ruleGroupsApi.create(projectId, name);
      setRuleGroups(prev => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
      const forRule = newRuleGroupContext?.forRule;
      if (forRule) {
        const next = rules.map(r => r.id === forRule.id ? { ...r, group: group.name } : r);
        setRules(next);
        await rulesApi.save(projectId, next);
      }
      setNewRuleGroupContext(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNewRuleGroupError(err.message);
      } else {
        setError(String(err));
        setNewRuleGroupContext(null);
      }
    }
  };

  const handleSaveRenameRuleGroup = async (name: string) => {
    if (!renamingRuleGroup) return;
    setRenameRuleGroupError(null);
    try {
      const updated = await ruleGroupsApi.rename(projectId, renamingRuleGroup.id, name);
      setRuleGroups(prev => prev.map(g => g.id === updated.id ? updated : g).sort((a, b) => a.name.localeCompare(b.name)));
      setRules(prev => prev.map(r => r.group === renamingRuleGroup.name ? { ...r, group: updated.name } : r));
      setRenamingRuleGroup(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRenameRuleGroupError(err.message);
      } else {
        setError(String(err));
        setRenamingRuleGroup(null);
      }
    }
  };

  const handleConfirmRemoveRuleGroup = async () => {
    if (!removingRuleGroup) return;
    try {
      await ruleGroupsApi.delete(projectId, removingRuleGroup.id);
      setRuleGroups(prev => prev.filter(g => g.id !== removingRuleGroup.id));
      setRules(prev => prev.map(r => r.group === removingRuleGroup.name ? { ...r, group: undefined } : r));
      setRemovingRuleGroup(null);
    } catch (err) {
      setError(String(err));
      setRemovingRuleGroup(null);
    }
  };

  const performRemoveRule = (rule: RuleDefinition) => {
    const next = rules.filter(r => r.id !== rule.id);
    setRules(next);
    rulesApi.save(projectId, next)
      .then(() => refreshRuleGroups())
      .catch(err => setError(String(err)));
  };

  const handleRemoveRuleRequest = (rule: RuleDefinition) => {
    const usage = computeRuleUsage(rule, rules);
    if (usage.length === 0) {
      performRemoveRule(rule);
    } else {
      setRemoveRuleTarget({ rule, usage });
    }
  };

  const handleConfirmRemoveRule = () => {
    if (!removeRuleTarget) return;
    performRemoveRule(removeRuleTarget.rule);
    setRemoveRuleTarget(null);
  };

  const handleNewFlag = (presetGroup?: string) => {
    const existingIds = new Set(flags.map(f => f.id));
    const newFlag: FlagDefinition = {
      id: generateUniqueId(existingIds),
      name: '',
      defaultActive: false,
      ...(presetGroup ? { group: presetGroup } : {}),
    };
    setFlags(prev => [...prev, newFlag]);
    setIsNewFlag(true);
    setEditingFlagId(newFlag.id);
  };

  const handleSelectFlag = (flag: FlagDefinition) => {
    setIsNewFlag(false);
    setEditingFlagId(flag.id);
  };

  const handleSaveFlag = (updated: FlagDefinition) => {
    const next = flags.map(f => f.id === editingFlagId ? updated : f);
    setFlags(next);
    setEditingFlagId(null);
    setIsNewFlag(false);
    flagsApi.save(projectId, next)
      .then(() => { refreshFlagGroups(); refreshFlagUsageCounts(); })
      .catch(err => setError(String(err)));
  };

  const handleCancelEditFlag = () => {
    if (isNewFlag && editingFlagId !== null) {
      setFlags(prev => prev.filter(f => f.id !== editingFlagId));
    }
    setEditingFlagId(null);
    setIsNewFlag(false);
  };

  const handleSaveRenameFlag = (name: string) => {
    if (!renamingFlag) return;
    const next = flags.map(f => f.id === renamingFlag.id ? { ...f, name } : f);
    setFlags(next);
    setRenamingFlag(null);
    flagsApi.save(projectId, next).catch(err => setError(String(err)));
  };

  const handleMoveFlag = (flag: FlagDefinition, groupName: string | undefined) => {
    const next = flags.map(f => f.id === flag.id ? { ...f, group: groupName } : f);
    setFlags(next);
    flagsApi.save(projectId, next)
      .then(() => { refreshFlagGroups(); refreshFlagUsageCounts(); })
      .catch(err => setError(String(err)));
  };

  const handleOpenNewGroup = (forFlag?: FlagDefinition) => {
    setNewGroupError(null);
    setNewGroupContext({ forFlag });
  };

  const handleCreateGroup = async (name: string) => {
    setNewGroupError(null);
    try {
      const group = await flagGroupsApi.create(projectId, name);
      setFlagGroups(prev => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
      const forFlag = newGroupContext?.forFlag;
      if (forFlag) {
        const next = flags.map(f => f.id === forFlag.id ? { ...f, group: group.name } : f);
        setFlags(next);
        await flagsApi.save(projectId, next);
        refreshFlagUsageCounts();
      }
      setNewGroupContext(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNewGroupError(err.message);
      } else {
        setError(String(err));
        setNewGroupContext(null);
      }
    }
  };

  const handleSaveRenameGroup = async (name: string) => {
    if (!renamingGroup) return;
    setRenameGroupError(null);
    try {
      const updated = await flagGroupsApi.rename(projectId, renamingGroup.id, name);
      setFlagGroups(prev => prev.map(g => g.id === updated.id ? updated : g).sort((a, b) => a.name.localeCompare(b.name)));
      setFlags(prev => prev.map(f => f.group === renamingGroup.name ? { ...f, group: updated.name } : f));
      setRenamingGroup(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRenameGroupError(err.message);
      } else {
        setError(String(err));
        setRenamingGroup(null);
      }
    }
  };

  const handleConfirmRemoveGroup = async () => {
    if (!removingGroup) return;
    try {
      await flagGroupsApi.delete(projectId, removingGroup.id);
      setFlagGroups(prev => prev.filter(g => g.id !== removingGroup.id));
      setFlags(prev => prev.map(f => f.group === removingGroup.name ? { ...f, group: undefined } : f));
      setRemovingGroup(null);
    } catch (err) {
      setError(String(err));
      setRemovingGroup(null);
    }
  };

  const performRemoveFlag = (flag: FlagDefinition) => {
    const next = flags.filter(f => f.id !== flag.id);
    setFlags(next);
    flagsApi.save(projectId, next)
      .then(() => { refreshFlagGroups(); refreshFlagUsageCounts(); })
      .catch(err => setError(String(err)));
  };

  const handleRemoveFlagRequest = async (flag: FlagDefinition) => {
    try {
      const usage = await flagsApi.checkUsage(projectId, flag.id);
      if (usage.scenes.length === 0 && usage.rules.length === 0) {
        performRemoveFlag(flag);
      } else {
        setRemoveFlagTarget({ flag, usage });
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleConfirmRemoveFlag = () => {
    if (!removeFlagTarget) return;
    performRemoveFlag(removeFlagTarget.flag);
    setRemoveFlagTarget(null);
  };

  return (
    <PageLayout>
      <SimulatorTopBar
        projectName={projectName}
        onBack={onBack}
        chapters={chapters}
        currentChapterId={currentChapterId}
        onSelectChapter={setCurrentChapterId}
        onNewChapter={handleNewChapter}
        onRemoveChapter={handleRemoveFlagRequest}
      />
      <PageBody>
        {loading && <p style={{ padding: 'var(--size-16)' }}>Loading…</p>}
        {error && <p style={{ padding: 'var(--size-16)', color: 'var(--color-danger)' }}>{error}</p>}
        {!loading && (
          <div className="simulator-root">
            {/* ===== Rule Pipeline: rules -> flags -> preview ===== */}
            <div className="simulator-pipeline">
              <div className="simulator-pipeline__header">
                <span className="simulator-pipeline__title">Rule pipeline</span>
                <span className="simulator-pipeline__hint">rules set flags → flags pick the scene · resolved at each wake</span>
              </div>
              <div className="simulator-pipeline__row">
                {/* RULES */}
                <SimulatorRulesPanel
                  rules={rules}
                  groups={ruleGroups}
                  flagsById={flagsById}
                  onSelectRule={setEditingRuleIndex}
                  onNewRule={handleNewRule}
                  onRenameRule={setRenamingRule}
                  onMoveRule={handleMoveRule}
                  onNewGroupForRule={handleOpenNewRuleGroup}
                  onRemoveRule={handleRemoveRuleRequest}
                  onNewGroup={() => handleOpenNewRuleGroup()}
                  onRenameGroup={setRenamingRuleGroup}
                  onRemoveGroup={setRemovingRuleGroup}
                />

                <Arrow />

                {/* FLAGS */}
                <SimulatorFlagsPanel
                  flags={flags}
                  groups={flagGroups}
                  usageCounts={flagUsageCounts}
                  onNewFlag={handleNewFlag}
                  onSelectFlag={handleSelectFlag}
                  onRenameFlag={setRenamingFlag}
                  onMoveFlag={handleMoveFlag}
                  onNewGroupForFlag={handleOpenNewGroup}
                  onRemoveFlag={handleRemoveFlagRequest}
                  onNewGroup={() => handleOpenNewGroup()}
                  onRenameGroup={setRenamingGroup}
                  onRemoveGroup={setRemovingGroup}
                />

                <Arrow />

                {/* PREVIEW */}
                <div className="simulator-panel simulator-panel--preview">
                  <div className="simulator-panel__header">
                    <span>Preview</span>
                    <span className="simulator-panel__hint">composited · real sprites</span>
                  </div>
                  <div className="simulator-preview-body">
                    <div className="simulator-phone-wrap">
                      <div className="simulator-phone">
                        <div className="simulator-phone__bezel" />
                        <span className="simulator-phone__badge">ON SCREEN</span>
                        <div className="simulator-phone__sprite simulator-phone__sprite--tree">tree</div>
                        <div className="simulator-phone__sprite simulator-phone__sprite--fox">fox</div>
                        <div className="simulator-phone__sprite simulator-phone__sprite--aurora">aurora band</div>
                        <span className="simulator-phone__scene-name">Aurora Forest</span>
                      </div>
                      <div className="simulator-edit-scene-link">✎ Edit scene ▸</div>
                    </div>
                    <div className="simulator-selection-list">
                      <span className="simulator-qualify-caption">3 qualify at this wake</span>
                      <div className="simulator-order-toggle">
                        <span>Order by</span>
                        <span
                          className={`simulator-order-toggle__option ${orderBy === 'least_shown' ? 'simulator-order-toggle__option--active' : ''}`}
                          onClick={() => setOrderBy('least_shown')}
                        >
                          Least shown
                        </span>
                        <span
                          className={`simulator-order-toggle__option ${orderBy === 'points' ? 'simulator-order-toggle__option--active' : ''}`}
                          onClick={() => setOrderBy('points')}
                        >
                          Points
                        </span>
                      </div>
                      <div className="simulator-scene-row simulator-scene-row--wins">
                        <span className="simulator-scene-row__badge">WINS</span>
                        <span className="simulator-scene-row__name">Aurora Forest</span>
                        <span className="simulator-scene-row__value">3×</span>
                      </div>
                      <div className="simulator-scene-row">
                        <span className="simulator-scene-row__badge">#2</span>
                        <span className="simulator-scene-row__name">Night City</span>
                        <span className="simulator-scene-row__value">12×</span>
                      </div>
                      <div className="simulator-scene-row simulator-scene-row--out">
                        <span className="simulator-scene-row__badge">OUT</span>
                        <span className="simulator-scene-row__name">Day Forest</span>
                        <span className="simulator-scene-row__reason">needs day</span>
                      </div>
                    </div>
                  </div>
                  <div className="simulator-stale-banner">
                    <span>⟳</span>
                    <span>Stale — re-picked only on wake</span>
                  </div>
                  <div className="simulator-wake-button">◐ Wake screen — pick a scene now</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageBody>
      {editingRuleIndex !== null && (
        <RuleEditModal
          rule={rules[editingRuleIndex]}
          flags={flags}
          groups={ruleGroups}
          onSave={handleSaveRule}
          onCancel={handleCancelEditRule}
        />
      )}
      {renamingRule && (
        <RenameRuleModal
          rule={renamingRule}
          comboCount={computeRuleUsage(renamingRule, rules).filter(u => u.type === 'COMBO').length}
          onSave={handleSaveRenameRule}
          onCancel={() => setRenamingRule(null)}
        />
      )}
      {newRuleGroupContext && (
        <NewRuleGroupModal
          error={newRuleGroupError}
          onCreate={handleCreateRuleGroup}
          onCancel={() => { setNewRuleGroupContext(null); setNewRuleGroupError(null); }}
        />
      )}
      {renamingRuleGroup && (
        <RenameRuleGroupModal
          group={renamingRuleGroup}
          error={renameRuleGroupError}
          onSave={handleSaveRenameRuleGroup}
          onCancel={() => { setRenamingRuleGroup(null); setRenameRuleGroupError(null); }}
        />
      )}
      {removeRuleTarget && (
        <RemoveRuleGuardedModal
          rule={removeRuleTarget.rule}
          usage={removeRuleTarget.usage}
          onCancel={() => setRemoveRuleTarget(null)}
          onConfirm={handleConfirmRemoveRule}
        />
      )}
      {removingRuleGroup && (
        <RemoveRuleGroupModal
          group={removingRuleGroup}
          affectedRules={rules.filter(r => r.group === removingRuleGroup.name)}
          onCancel={() => setRemovingRuleGroup(null)}
          onConfirm={handleConfirmRemoveRuleGroup}
        />
      )}
      {editingFlagId !== null && (
        <FlagEditModal
          flag={flags.find(f => f.id === editingFlagId)!}
          isNew={isNewFlag}
          groups={flagGroups}
          onSave={handleSaveFlag}
          onCancel={handleCancelEditFlag}
        />
      )}
      {renamingFlag && (
        <RenameFlagModal
          flag={renamingFlag}
          onSave={handleSaveRenameFlag}
          onCancel={() => setRenamingFlag(null)}
        />
      )}
      {newGroupContext && (
        <NewGroupModal
          error={newGroupError}
          onCreate={handleCreateGroup}
          onCancel={() => { setNewGroupContext(null); setNewGroupError(null); }}
        />
      )}
      {renamingGroup && (
        <RenameGroupModal
          group={renamingGroup}
          error={renameGroupError}
          onSave={handleSaveRenameGroup}
          onCancel={() => { setRenamingGroup(null); setRenameGroupError(null); }}
        />
      )}
      {removeFlagTarget && (
        <RemoveFlagGuardedModal
          flag={removeFlagTarget.flag}
          usage={removeFlagTarget.usage}
          onCancel={() => setRemoveFlagTarget(null)}
          onConfirm={handleConfirmRemoveFlag}
        />
      )}
      {removingGroup && (
        <RemoveGroupModal
          group={removingGroup}
          affectedFlags={flags.filter(f => f.group === removingGroup.name)}
          onCancel={() => setRemovingGroup(null)}
          onConfirm={handleConfirmRemoveGroup}
        />
      )}
    </PageLayout>
  );
}

function Arrow() {
  return (
    <div className="simulator-arrow">
      <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
        <path d="M2 8 H17" stroke="#3f3f46" strokeWidth="1.5" />
        <path d="M13 3 L18 8 L13 13" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
