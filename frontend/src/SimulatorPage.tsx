import { useState, useEffect, useMemo } from 'react';
import './SimulatorPage.scss';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';
import { Button } from './components/Button';
import { ApiError, rulesApi, ruleGroupsApi, flagsApi, flagGroupsApi, type RuleDefinition, type RuleGroup, type FlagDefinition, type FlagGroup } from './api';
import { RuleEditModal, emptyRule } from './RulesPage';
import { SimulatorRulesPanel } from './SimulatorRulesPanel';
import { SimulatorFlagsPanel } from './SimulatorFlagsPanel';
import {
  generateUniqueId,
  FlagEditModal,
  RenameFlagModal,
  NewGroupModal,
  RenameGroupModal,
  RemoveFlagGuardedModal,
  RemoveGroupModal,
} from './SimulatorFlagModals';

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

  const flagsById = useMemo(() => new Map(flags.map(f => [f.id, f])), [flags]);

  const handleSaveRule = (updated: RuleDefinition) => {
    if (editingRuleIndex === null) return;
    const next = rules.map((r, i) => i === editingRuleIndex ? updated : r);
    setRules(next);
    setEditingRuleIndex(null);
    setIsNewRule(false);
    rulesApi.save(projectId, next).catch(err => setError(String(err)));
  };

  const handleNewRule = () => {
    setRules(prev => [...prev, emptyRule()]);
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
      <PageHeader title={`${projectName} — Simulator`} left={<Button onClick={onBack}>←</Button>} />
      <PageBody>
        {loading && <p style={{ padding: 'var(--size-16)' }}>Loading…</p>}
        {error && <p style={{ padding: 'var(--size-16)', color: 'var(--color-danger)' }}>{error}</p>}
        {!loading && (
          <div className="simulator-root">
            {/* ===== Simulated State: HUD + spine + engagement + ambient ===== */}
            <div className="simulator-state">
              <div className="simulator-hud">
                <span className="simulator-hud__title"><span className="simulator-hud__dot" />Simulated state</span>
                <span className="simulator-hud__divider" />
                <span className="simulator-hud__stat">Chapter <b>2 · The Deep Wood</b></span>
                <span className="simulator-hud__divider" />
                <span className="simulator-hud__stat">Ambient <b>Night · Tue</b></span>
                <span className="simulator-hud__divider" />
                <span className="simulator-hud__stat">Active days <b>8</b> · Wakes <b>34</b></span>
                <div className="simulator-hud__tabs">
                  <span className="simulator-hud__tab simulator-hud__tab--active">Simulator</span>
                  <span className="simulator-hud__tab" onClick={onBack}>Scene editor <span>▸</span></span>
                </div>
              </div>

              <div className="simulator-spine">
                <span className="simulator-spine__label">Spine <span>· 2/14</span></span>
                <div className="simulator-spine__track">
                  <div className="simulator-spine__node simulator-spine__node--done">1</div>
                  <div className="simulator-spine__node simulator-spine__node--current">
                    <span className="simulator-spine__node-num">2</span>
                    <span className="simulator-spine__node-name">The Deep Wood</span>
                    <span className="simulator-spine__node-here">★ here</span>
                  </div>
                  {[3, 4, 5, 6, 7, 8].map(n => (
                    <div key={n} className="simulator-spine__node simulator-spine__node--locked">{n}</div>
                  ))}
                  <div className="simulator-spine__node simulator-spine__node--overflow">+6</div>
                </div>
                <span className="simulator-spine__add">+ Chapter</span>
              </div>

              <div className="simulator-engagement-ambient">
                <div className="simulator-column simulator-column--divided">
                  <div className="simulator-column__title">Engagement <span>fuels progression · idle never advances</span></div>
                  <div className="simulator-column__fields">
                    <Stepper label="Active days" value={8} />
                    <Stepper label="Total wakes" value={34} />
                    <Stepper label="Forest views" value={5} />
                  </div>
                </div>
                <div className="simulator-column">
                  <div className="simulator-column__title">Ambient <span>mood · re-checked every wake</span></div>
                  <div className="simulator-column__fields">
                    <DropdownField label="Time of day" value="21:30 · Night" />
                    <DropdownField label="Weekday" value="Tue" />
                    <DropdownField label="Persona" value="Power user" />
                  </div>
                </div>
              </div>
            </div>

            {/* ===== Rule Pipeline: rules -> flags -> preview ===== */}
            <div className="simulator-pipeline">
              <div className="simulator-pipeline__header">
                <span className="simulator-pipeline__title">Rule pipeline</span>
                <span className="simulator-pipeline__hint">rules set flags → flags pick the scene · resolved at each wake</span>
              </div>
              <div className="simulator-pipeline__row">
                {/* RULES */}
                <SimulatorRulesPanel rules={rules} groups={ruleGroups} flagsById={flagsById} onSelectRule={setEditingRuleIndex} onNewRule={handleNewRule} />

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
          onSave={handleSaveRule}
          onCancel={handleCancelEditRule}
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

function Stepper({ label, value }: { label: string; value: number }) {
  return (
    <div className="simulator-field">
      <span className="simulator-field-label">{label}</span>
      <div className="simulator-stepper">
        <span className="simulator-stepper__btn">−</span>
        <span className="simulator-stepper__value">{value}</span>
        <span className="simulator-stepper__btn">+</span>
      </div>
    </div>
  );
}

function DropdownField({ label, value }: { label: string; value: string }) {
  return (
    <div className="simulator-field">
      <span className="simulator-field-label">{label}</span>
      <span className="simulator-dropdown-field">{value} ▾</span>
    </div>
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
