import { useEffect, useMemo, useRef, useState } from 'react';
import type { RuleDefinition } from '@livewallpaper/types';
import type { FlagDefinition } from './api';
import { resolveWorldState, type FlagChangeHistory, type WorldClock, type WorldState } from './ruleEngine';

export const TIME_OPTIONS = ['06:00 · Morning', '12:00 · Midday', '17:00 · Evening', '21:30 · Night'];
export const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const SCENE_OPTIONS = ['Aurora Forest', 'Night City', 'Day Forest'];

// DAY_OPTIONS is Mon-first; RuleCondition.daysOfWeek is Sun-first (0=Sun … 6=Sat).
const DAY_OF_WEEK_NUMS = [1, 2, 3, 4, 5, 6, 0];

function hourFromTimeOption(opt: string): number {
  return parseInt(opt.split(':')[0], 10);
}

function worldClockFor(fields: Pick<PersistedFields, 'timeOfDay' | 'dayOfWeek' | 'daysSinceInstall'>): WorldClock {
  const currentHour = hourFromTimeOption(fields.timeOfDay);
  const dayIndex = DAY_OPTIONS.indexOf(fields.dayOfWeek);
  return {
    currentHour,
    dayOfWeekNum: dayIndex === -1 ? 0 : DAY_OF_WEEK_NUMS[dayIndex],
    installHours: fields.daysSinceInstall * 24 + currentHour,
  };
}

interface PersistedFields {
  chapterId: string | null;
  timeOfDay: string;
  dayOfWeek: string;
  daysSinceInstall: number;
  totalWakes: number;
  lastSceneShown: string;
  activeFlagIds: string[];
  flagChanges: FlagChangeHistory;
  firedOneShotRuleIds: string[];
  /** Per-scene times-shown counts, incremented on each wake. Drives "Least shown" and scene_count. */
  sceneCounts: Record<string, number>;
  /** Scene pinned to the render surface — captured at the last wake ("re-picked only on wake"). */
  renderedSceneId: string | null;
  /** Whether defaultActive flags have been seeded into activeFlagIds for this project yet. */
  seeded: boolean;
}

const DEFAULTS: PersistedFields = {
  chapterId: null,
  timeOfDay: TIME_OPTIONS[3],
  dayOfWeek: DAY_OPTIONS[1],
  daysSinceInstall: 8,
  totalWakes: 34,
  lastSceneShown: SCENE_OPTIONS[0],
  activeFlagIds: [],
  flagChanges: {},
  firedOneShotRuleIds: [],
  sceneCounts: {},
  renderedSceneId: null,
  seeded: false,
};

function storageKey(projectId: string) {
  return `simulator-state:${projectId}`;
}

function loadPersisted(projectId: string): PersistedFields {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

type NumberUpdater = number | ((prev: number) => number);

/** Re-derives active flags from current world-clock fields, carrying forward prior flag state. */
function runEngine(
  fields: PersistedFields,
  flags: FlagDefinition[],
  rules: RuleDefinition[],
): Pick<PersistedFields, 'activeFlagIds' | 'flagChanges' | 'firedOneShotRuleIds'> {
  const result = resolveWorldState({
    rules,
    flags,
    chapterId: fields.chapterId,
    clock: worldClockFor(fields),
    activeFlags: new Set(fields.activeFlagIds),
    flagChanges: fields.flagChanges,
    firedOneShotRuleIds: new Set(fields.firedOneShotRuleIds),
    sceneCounts: fields.sceneCounts,
  });
  return {
    activeFlagIds: [...result.activeFlags],
    flagChanges: result.flagChanges,
    firedOneShotRuleIds: [...result.firedOneShotRuleIds],
  };
}

export function useSimulatedState(projectId: string, flags: FlagDefinition[], rules: RuleDefinition[]) {
  const [fields, setFields] = useState<PersistedFields>(() => loadPersisted(projectId));
  const [stale, setStale] = useState(false);
  const loadedProjectId = useRef(projectId);

  const chapters = useMemo(
    () => flags.filter(f => f.isChapter).sort((a, b) => (a.chapterOrder ?? 0) - (b.chapterOrder ?? 0)),
    [flags],
  );

  useEffect(() => {
    if (loadedProjectId.current === projectId) return;
    loadedProjectId.current = projectId;
    setFields(loadPersisted(projectId));
    setStale(false);
  }, [projectId]);

  useEffect(() => {
    localStorage.setItem(storageKey(projectId), JSON.stringify(fields));
  }, [projectId, fields]);

  // Keep the persisted chapter selection valid as the real chapters list loads/changes.
  useEffect(() => {
    if (fields.chapterId !== null && chapters.some(c => c.id === fields.chapterId)) return;
    const fallback = chapters.length > 0 ? chapters[0].id : null;
    if (fallback !== fields.chapterId) {
      setFields(f => ({ ...f, chapterId: fallback }));
    }
  }, [chapters, fields.chapterId]);

  // Seed activeFlagIds from defaultActive flags once, the first time flags load for this project.
  useEffect(() => {
    if (flags.length === 0 || fields.seeded) return;
    const baseline = flags.filter(f => f.defaultActive).map(f => f.id);
    setFields(f => (f.seeded ? f : { ...f, activeFlagIds: baseline, seeded: true }));
  }, [flags, fields.seeded]);

  // Re-run the rule engine whenever anything it reads changes: rule/flag definitions
  // (design-time edits) or any world-clock input from the topbar (time/day/daysSinceInstall/
  // chapter). Flags reflect live, not just on the next Wake.
  useEffect(() => {
    if (!fields.seeded) return;
    setFields(f => ({ ...f, ...runEngine(f, flags, rules) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, rules, fields.seeded, fields.chapterId, fields.timeOfDay, fields.dayOfWeek, fields.daysSinceInstall]);

  function updateField<K extends keyof PersistedFields>(
    key: K,
    valueOrFn: PersistedFields[K] | ((prev: PersistedFields[K]) => PersistedFields[K]),
  ) {
    setFields(f => ({
      ...f,
      [key]: typeof valueOrFn === 'function' ? (valueOrFn as (prev: PersistedFields[K]) => PersistedFields[K])(f[key]) : valueOrFn,
    }));
    setStale(true);
  }

  // Seed the pinned render scene once (e.g. the current winner on first load), without counting
  // it as a wake. No-op once a scene is already pinned, so it never overrides a wake.
  const pinRenderedScene = (id: string) => {
    setFields(f => (f.renderedSceneId ? f : { ...f, renderedSceneId: id }));
  };

  const handleReset = () => {
    setFields(f => ({
      ...f,
      timeOfDay: DEFAULTS.timeOfDay,
      dayOfWeek: DEFAULTS.dayOfWeek,
      daysSinceInstall: DEFAULTS.daysSinceInstall,
      totalWakes: DEFAULTS.totalWakes,
    }));
    setStale(true);
  };

  // A snapshot of the live world, for evaluating scene qualification and sprite conditions
  // outside the rule engine.
  const world: WorldState = useMemo(() => ({
    clock: worldClockFor(fields),
    activeFlags: new Set(fields.activeFlagIds),
    sceneCounts: fields.sceneCounts,
    flagChanges: fields.flagChanges,
  }), [fields]);

  // Wake re-picks the on-screen scene: the caller passes the current winner (computed from the
  // live ranking). Its show-count is bumped and it's pinned as the rendered scene.
  const wake = (winner: { id: string; name: string } | null) => {
    setFields(f => ({
      ...f,
      ...runEngine(f, flags, rules),
      ...(winner
        ? {
            sceneCounts: { ...f.sceneCounts, [winner.id]: (f.sceneCounts[winner.id] ?? 0) + 1 },
            lastSceneShown: winner.name,
            renderedSceneId: winner.id,
          }
        : { lastSceneShown: '—', renderedSceneId: null }),
      totalWakes: f.totalWakes + 1,
    }));
    setStale(false);
  };

  return {
    world,
    sceneCounts: fields.sceneCounts,
    renderedSceneId: fields.renderedSceneId,
    chapterId: fields.chapterId,
    timeOfDay: fields.timeOfDay,
    dayOfWeek: fields.dayOfWeek,
    daysSinceInstall: fields.daysSinceInstall,
    totalWakes: fields.totalWakes,
    lastSceneShown: fields.lastSceneShown,
    activeFlagIds: fields.activeFlagIds,
    stale,
    setChapterId: (v: string) => updateField('chapterId', v),
    setTimeOfDay: (v: string) => updateField('timeOfDay', v),
    setDayOfWeek: (v: string) => updateField('dayOfWeek', v),
    setDaysSinceInstall: (v: NumberUpdater) => updateField('daysSinceInstall', v),
    setTotalWakes: (v: NumberUpdater) => updateField('totalWakes', v),
    handleReset,
    wake,
    pinRenderedScene,
  };
}
