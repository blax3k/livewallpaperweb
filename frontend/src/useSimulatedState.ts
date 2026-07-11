import { useEffect, useMemo, useRef, useState } from 'react';
import type { RuleDefinition } from '@livewallpaper/types';
import type { FlagDefinition } from './api';
import { resolveWorldState, type FlagChangeHistory, type WorldClock, type WorldState } from './ruleEngine';

export const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const SCENE_OPTIONS = ['Aurora Forest', 'Night City', 'Day Forest'];

// timeOfDay is stored as a 24-hour "HH:MM" string and adjusted in half-hour steps.
export const TIME_STEP_MINUTES = 30;
// One entry per hour (00:00 … 23:00), for the "pick from a list" dropdown.
export const TIME_LIST: string[] = Array.from({ length: 12 }, (_, i) => minutesToTime(i * 120));

/** Minutes since midnight for an "HH:MM" string, tolerant of the legacy "HH:MM · Label" format. */
export function timeToMinutes(t: string): number {
  const hm = t.split('·')[0].trim();
  const [h, m] = hm.split(':');
  const mins = (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
  return ((mins % 1440) + 1440) % 1440;
}

/** Formats minutes-since-midnight as a zero-padded 24-hour "HH:MM" string. */
export function minutesToTime(mins: number): string {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Parses free-form time input ("9", "930", "9:30", "09:30") to minutes, or null if invalid. */
export function parseTimeInput(raw: string): number | null {
  const s = raw.trim();
  let h: number;
  let m: number;
  const colon = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colon) {
    h = +colon[1];
    m = +colon[2];
  } else if (/^\d{1,2}$/.test(s)) {
    h = +s;
    m = 0;
  } else if (/^\d{3,4}$/.test(s)) {
    h = Math.floor(+s / 100);
    m = +s % 100;
  } else {
    return null;
  }
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Coarse mood label for a time, for the read-only status strip. */
export function timeOfDayLabel(t: string): string {
  const h = Math.floor(timeToMinutes(t) / 60);
  if (h < 5) return 'Night';
  if (h < 12) return 'Morning';
  if (h < 17) return 'Midday';
  if (h < 21) return 'Evening';
  return 'Night';
}

// DAY_OPTIONS is Mon-first; RuleCondition.daysOfWeek is Sun-first (0=Sun … 6=Sat).
const DAY_OF_WEEK_NUMS = [1, 2, 3, 4, 5, 6, 0];

function worldClockFor(fields: Pick<PersistedFields, 'timeOfDay' | 'dayOfWeek' | 'daysSinceInstall'>): WorldClock {
  const currentMinuteOfDay = timeToMinutes(fields.timeOfDay);
  const currentHour = Math.floor(currentMinuteOfDay / 60);
  const dayIndex = DAY_OPTIONS.indexOf(fields.dayOfWeek);
  return {
    currentHour,
    currentMinuteOfDay,
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
  timeOfDay: '21:30',
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
    const merged = { ...DEFAULTS, ...JSON.parse(raw) };
    // Normalize legacy "HH:MM · Label" values to the plain "HH:MM" format.
    merged.timeOfDay = minutesToTime(timeToMinutes(merged.timeOfDay));
    return merged;
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
            // Keyed by scene id — the stable identifier scene_count conditions store and the
            // on-device runtime tracks show-counts by (the export names each scene file <id>.json).
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
