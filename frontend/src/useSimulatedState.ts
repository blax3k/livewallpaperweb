import { useEffect, useRef, useState } from 'react';
import type { FlagDefinition } from './api';

export const TIME_OPTIONS = ['06:00 · Morning', '12:00 · Midday', '17:00 · Evening', '21:30 · Night'];
export const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const SCENE_OPTIONS = ['Aurora Forest', 'Night City', 'Day Forest'];

interface PersistedFields {
  chapterId: string | null;
  timeOfDay: string;
  dayOfWeek: string;
  daysSinceInstall: number;
  totalWakes: number;
  lastSceneShown: string;
}

const DEFAULTS: PersistedFields = {
  chapterId: null,
  timeOfDay: TIME_OPTIONS[3],
  dayOfWeek: DAY_OPTIONS[1],
  daysSinceInstall: 8,
  totalWakes: 34,
  lastSceneShown: SCENE_OPTIONS[0],
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

export function useSimulatedState(projectId: string, chapters: FlagDefinition[]) {
  const [fields, setFields] = useState<PersistedFields>(() => loadPersisted(projectId));
  const [stale, setStale] = useState(false);
  const loadedProjectId = useRef(projectId);

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

  const handleWake = () => {
    const nextScene = SCENE_OPTIONS[Math.floor(Math.random() * SCENE_OPTIONS.length)];
    setFields(f => ({ ...f, lastSceneShown: nextScene, totalWakes: f.totalWakes + 1 }));
    setStale(false);
  };

  return {
    chapterId: fields.chapterId,
    timeOfDay: fields.timeOfDay,
    dayOfWeek: fields.dayOfWeek,
    daysSinceInstall: fields.daysSinceInstall,
    totalWakes: fields.totalWakes,
    lastSceneShown: fields.lastSceneShown,
    stale,
    setChapterId: (v: string) => updateField('chapterId', v),
    setTimeOfDay: (v: string) => updateField('timeOfDay', v),
    setDayOfWeek: (v: string) => updateField('dayOfWeek', v),
    setDaysSinceInstall: (v: NumberUpdater) => updateField('daysSinceInstall', v),
    setTotalWakes: (v: NumberUpdater) => updateField('totalWakes', v),
    handleReset,
    handleWake,
  };
}
