import { useState, useEffect, useMemo, useRef } from 'react';
import './SimulatorPage.scss';
import { PageLayout, PageBody } from './components/PageLayout';
import { ApiError, rulesApi, ruleGroupsApi, flagsApi, flagGroupsApi, scenesApi, projectsApi, type RuleDefinition, type RuleGroup, type FlagDefinition, type FlagGroup, type SceneSummary, type SceneDetail } from './api';
import type { SceneFlagDeclarations } from '@livewallpaper/types';
import { rankScenes, winnerOf, type QualifyContext } from './simulatorScenes';
import { SceneFlagsModal } from './controls/modals/SceneFlagsModal';
import { NewSceneDialog } from './controls/modals/NewSceneDialog';
import { SimulatorTopBar } from './SimulatorTopBar';
import { SimulatorControlsPanel } from './SimulatorControlsPanel';
import { useSimulatedState } from './useSimulatedState';
import { SimulatorRulesPanel, COMBO_CONDITION_TYPES } from './SimulatorRulesPanel';
import { SimulatorFlagsPanel } from './SimulatorFlagsPanel';
import { SimulatorPreviewPanel } from './SimulatorPreviewPanel';
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
  onManageScenes: () => void;
  onEditScene: (sceneId: string) => void;
}

export function SimulatorPage({ projectId, projectName, onBack, onManageScenes, onEditScene }: SimulatorPageProps) {
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [ruleGroups, setRuleGroups] = useState<RuleGroup[]>([]);
  const [flags, setFlags] = useState<FlagDefinition[]>([]);
  const [flagGroups, setFlagGroups] = useState<FlagGroup[]>([]);
  const [flagUsageCounts, setFlagUsageCounts] = useState<Record<string, { rules: number; scenes: number }>>({});
  // Lightweight scene metadata for ranking the cards (fetched up front, cheap — no sprites).
  const [sceneSummaries, setSceneSummaries] = useState<SceneSummary[]>([]);
  // Full scene detail (incl. sprites), fetched lazily and cached by id — only the scenes we
  // actually render or edit. Keeps large sprite payloads off the initial load.
  const [sceneDetails, setSceneDetails] = useState<Record<string, SceneDetail>>({});
  const detailPromises = useRef<Map<string, Promise<SceneDetail | null>>>(new Map());
  const [flagsSceneTarget, setFlagsSceneTarget] = useState<SceneDetail | null>(null);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
  // Scene painted on the preview surface. Session-only (deliberately not persisted): the preview
  // is blank on every load and only shows a scene after a Wake this session.
  const [wokenSceneId, setWokenSceneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Landing directly on the simulator (its URL is the project's main page) arrives with an empty
  // name; fetch it so the topbar isn't blank on a fresh load or reload.
  const [fetchedName, setFetchedName] = useState<string | null>(null);
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

  useEffect(() => {
    // Load the rule/flag definitions plus lightweight scene metadata (declarations only) so the
    // browser can rank scenes offline. Full scene detail — including the heavy sprite payload — is
    // fetched lazily per scene, only when a scene needs to render or have its flags edited.
    Promise.all([
      rulesApi.list(projectId),
      ruleGroupsApi.list(projectId),
      flagsApi.list(projectId),
      flagGroupsApi.list(projectId),
      flagsApi.checkUsageCounts(projectId),
      scenesApi.list(projectId),
    ])
      .then(([r, rg, f, g, u, scenes]) => { setRules(r); setRuleGroups(rg); setFlags(f); setFlagGroups(g); setFlagUsageCounts(u); setSceneSummaries(scenes); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, [projectId]);

  // Resolve the project name when we arrive without one (e.g. a direct load of the simulator URL).
  useEffect(() => {
    if (projectName) return;
    projectsApi.get(projectId).then(p => setFetchedName(p.name)).catch(() => {});
  }, [projectId, projectName]);

  // Fetch (and cache) a scene's full detail on demand. Returns the cached copy immediately if we
  // already have it, dedupes concurrent requests, and surfaces errors without throwing.
  const ensureSceneDetail = (id: string): Promise<SceneDetail | null> => {
    if (sceneDetails[id]) return Promise.resolve(sceneDetails[id]);
    const pending = detailPromises.current.get(id);
    if (pending) return pending;
    const p = scenesApi.get(id)
      .then(detail => { setSceneDetails(prev => ({ ...prev, [id]: detail })); return detail; })
      .catch(err => { setError(String(err)); return null; })
      .finally(() => { detailPromises.current.delete(id); }) as Promise<SceneDetail | null>;
    detailPromises.current.set(id, p);
    return p;
  };

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

  // The Flags panel lists ordinary flags only — chapters are managed from the Spine.
  const nonChapterFlags = useMemo(() => flags.filter(f => !f.isChapter), [flags]);

  const sim = useSimulatedState(projectId, flags, rules);
  const activeFlagIds = useMemo(() => new Set(sim.activeFlagIds), [sim.activeFlagIds]);

  const currentChapter = useMemo(() => chapters.find(c => c.id === sim.chapterId) ?? null, [chapters, sim.chapterId]);
  const currentChapterIndex = currentChapter ? chapters.indexOf(currentChapter) : -1;

  // Cards re-rank live off the current world; the winner drives Wake.
  const ranking = useMemo(() => {
    const ctx: QualifyContext = {
      activeFlags: activeFlagIds,
      flagName: id => flagsById.get(id)?.name || id,
    };
    return rankScenes(sceneSummaries, orderBy, ctx, sim.sceneCounts);
  }, [sceneSummaries, orderBy, activeFlagIds, sim.sceneCounts, flagsById]);
  const liveWinner = useMemo(() => winnerOf(ranking), [ranking]);

  // Seed the "last scene shown" reference once scenes/flags settle, so the topbar can label it even
  // before the first wake. No-op once set (including a value restored from a prior session). This
  // only feeds the label (renderedSummary); the preview surface is driven by wokenSceneId below.
  useEffect(() => {
    if (sim.renderedSceneId || !liveWinner) return;
    sim.pinRenderedScene(liveWinner.id);
  }, [sim.renderedSceneId, liveWinner]); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary of the last-shown scene — gives the topbar its label without needing the full detail.
  const renderedSummary = useMemo(
    () => sceneSummaries.find(s => s.id === sim.renderedSceneId) ?? null,
    [sceneSummaries, sim.renderedSceneId],
  );
  // Detail of the scene painted on the preview surface, or null when it's blank. Driven only by
  // wokenSceneId (set by Wake), so the preview starts blank on every load — a refresh never
  // re-activates the renderer, and neither does caching a scene's detail to edit its flags.
  const renderedScene = useMemo(
    () => (wokenSceneId ? sceneDetails[wokenSceneId] ?? null : null),
    [wokenSceneId, sceneDetails],
  );

  // Wake re-picks the on-screen scene; fetch the winner's detail first (no-op if already cached,
  // i.e. the scene isn't changing) so the render has its sprites ready.
  const handleWake = async () => {
    if (liveWinner) await ensureSceneDetail(liveWinner.id);
    sim.wake(liveWinner ? { id: liveWinner.id, name: liveWinner.name } : null);
    // The preview only ever changes on wake — pin the just-picked winner (or clear it when nothing
    // qualifies). The detail was warmed just above, so the render surface has its sprites ready.
    setWokenSceneId(liveWinner ? liveWinner.id : null);
  };

  const handleEditFlags = async (scene: { id: string }) => {
    // Editing flags needs the full scene so the save preserves its sprites.
    const detail = await ensureSceneDetail(scene.id);
    if (detail) setFlagsSceneTarget(detail);
  };

  const handleSaveSceneFlags = (declarations: SceneFlagDeclarations) => {
    if (!flagsSceneTarget) return;
    const target = flagsSceneTarget;
    const nextData = { ...target.data, flags: declarations };
    setSceneDetails(prev => ({ ...prev, [target.id]: { ...target, data: nextData } }));
    // Keep the summary's declarations in sync so the cards re-rank immediately.
    setSceneSummaries(prev => prev.map(s => s.id === target.id ? { ...s, flags: declarations } : s));
    setFlagsSceneTarget(null);
    scenesApi.update(target.id, target.label, nextData).catch(err => setError(String(err)));
  };

  const handleDeleteScene = (scene: { id: string; name: string }) => {
    if (!window.confirm(`Delete scene "${scene.name}"? This cannot be undone.`)) return;
    setSceneSummaries(prev => prev.filter(s => s.id !== scene.id));
    setSceneDetails(prev => { const { [scene.id]: _removed, ...rest } = prev; return rest; });
    scenesApi.delete(scene.id).catch(err => setError(String(err)));
  };

  const handleCreateScene = (label: string, copyFromSceneId?: string) => {
    const name = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    scenesApi.create(name, label.trim(), { sprites: [], xFocus: 0 }, projectId, copyFromSceneId)
      .then(scene => {
        setShowNewSceneDialog(false);
        onEditScene(scene.id);
      })
      .catch(err => setError(String(err)));
  };

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
        projectName={projectName || fetchedName || ''}
        onBack={onBack}
        onManageScenes={onManageScenes}
        chapterNumber={currentChapterIndex + 1}
        chapterName={currentChapter?.name || currentChapter?.id || ''}
        timeOfDay={sim.timeOfDay}
        dayOfWeek={sim.dayOfWeek}
        daysSinceInstall={sim.daysSinceInstall}
        totalWakes={sim.totalWakes}
        lastSceneShown={renderedSummary?.label ?? sim.lastSceneShown}
      />
      <PageBody>
        {loading && <p style={{ padding: 'var(--size-16)' }}>Loading…</p>}
        {error && <p style={{ padding: 'var(--size-16)', color: 'var(--color-danger)' }}>{error}</p>}
        {!loading && (
          <div className="simulator-root">
            <div className="simulator-stage">
              {/* Left column: the simulated-world controls stacked above the rule→flag pipeline. */}
              <div className="simulator-stage__left">
                <SimulatorControlsPanel
                  chapters={chapters}
                  currentChapterId={sim.chapterId}
                  onSelectChapter={sim.setChapterId}
                  onEditChapter={handleSelectFlag}
                  onNewChapter={handleNewChapter}
                  onRemoveChapter={handleRemoveFlagRequest}
                  timeOfDay={sim.timeOfDay}
                  onTimeOfDayChange={sim.setTimeOfDay}
                  dayOfWeek={sim.dayOfWeek}
                  onDayOfWeekChange={sim.setDayOfWeek}
                  daysSinceInstall={sim.daysSinceInstall}
                  onDaysSinceInstallChange={sim.setDaysSinceInstall}
                  totalWakes={sim.totalWakes}
                  onTotalWakesChange={sim.setTotalWakes}
                  onReset={sim.handleReset}
                />

                {/* ===== Rule Pipeline: rules -> flags ===== */}
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
                    flags={nonChapterFlags}
                    groups={flagGroups}
                    usageCounts={flagUsageCounts}
                    activeFlagIds={activeFlagIds}
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
                </div>
              </div>

              {/* Right column: preview keeps full stage height beside the controls + pipeline. */}
              <SimulatorPreviewPanel
                scenes={ranking}
                renderedScene={renderedScene}
                world={sim.world}
                orderBy={orderBy}
                onOrderByChange={setOrderBy}
                stale={sim.stale}
                wakeSeed={sim.totalWakes}
                onWake={handleWake}
                onEditScene={onEditScene}
                onEditFlags={handleEditFlags}
                onDeleteScene={handleDeleteScene}
                onAddScene={() => setShowNewSceneDialog(true)}
              />
            </div>
          </div>
        )}
      </PageBody>
      {editingRuleIndex !== null && (
        <RuleEditModal
          rule={rules[editingRuleIndex]}
          flags={flags}
          scenes={sceneSummaries}
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
      {showNewSceneDialog && (
        <NewSceneDialog
          scenes={sceneSummaries}
          onConfirm={handleCreateScene}
          onCancel={() => setShowNewSceneDialog(false)}
        />
      )}
      {flagsSceneTarget && (
        <SceneFlagsModal
          sceneName={flagsSceneTarget.label}
          flags={flags}
          declarations={flagsSceneTarget.data.flags ?? {}}
          liveEval={{
            activeFlags: activeFlagIds,
            flagName: id => flagsById.get(id)?.name || id,
            stateNote: `day ${sim.daysSinceInstall} · ${sim.timeOfDay}`,
          }}
          onSave={handleSaveSceneFlags}
          onClose={() => setFlagsSceneTarget(null)}
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
