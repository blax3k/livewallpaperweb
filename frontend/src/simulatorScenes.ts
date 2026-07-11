import type { SceneFlagDeclarations } from '@livewallpaper/types';

export type SceneStatus = 'wins' | 'ranked' | 'out';

/**
 * Everything ranking needs from a scene — its identity plus its selection metadata. Deliberately
 * lightweight (no sprites) so scenes can be ranked from the list endpoint's `SceneSummary`.
 */
export interface RankableScene {
  id: string;
  label: string;
  flags?: SceneFlagDeclarations;
}

/** A scene evaluated against the current simulated world, ready for the preview cards. */
export interface RankedScene {
  id: string;
  /** Display label. */
  name: string;
  status: SceneStatus;
  /** Rank badge for ranked (non-winning) scenes: 2…N. */
  rank?: number;
  /** Times-shown count — the deciding number for "Least shown". */
  count: number;
  /** Selection score — the deciding number for "Points". */
  score: number;
  /** Disqualification reason, shown on OUT cards. */
  reason?: string;
}

export interface QualifyContext {
  activeFlags: Set<string>;
  /** Resolves a flag id to its display name (falls back to the id). */
  flagName: (id: string) => string;
}

/**
 * First reason a scene is ineligible, or null if it qualifies. Order mirrors the declaration
 * shape: a missing required flag, then an active excluded flag.
 */
export function disqualifyReason(
  flags: SceneFlagDeclarations | undefined,
  ctx: QualifyContext,
): string | null {
  const decl = flags ?? {};
  for (const id of decl.required ?? []) {
    if (!ctx.activeFlags.has(id)) return `needs ${ctx.flagName(id)}`;
  }
  for (const id of decl.excluded ?? []) {
    if (ctx.activeFlags.has(id)) return `blocked by ${ctx.flagName(id)}`;
  }
  return null;
}

/** Sum of the weights of every active scored flag on the scene. */
export function sceneScore(flags: SceneFlagDeclarations | undefined, activeFlags: Set<string>): number {
  return (flags?.scored ?? []).reduce((sum, e) => sum + (activeFlags.has(e.flagId) ? e.weight : 0), 0);
}

/**
 * Rank every scene for the current world: qualifying scenes first (winner → ranked #2…N),
 * then disqualified ("out") scenes. `orderBy` decides the primary sort key among qualifiers;
 * the other key breaks ties, then label.
 */
export function rankScenes(
  scenes: RankableScene[],
  orderBy: 'least_shown' | 'points',
  ctx: QualifyContext,
  sceneCounts: Record<string, number>,
): RankedScene[] {
  const evaluated = scenes.map(s => ({
    scene: s,
    reason: disqualifyReason(s.flags, ctx),
    score: sceneScore(s.flags, ctx.activeFlags),
    count: sceneCounts[s.id] ?? 0,
  }));

  const qualifying = evaluated.filter(e => e.reason === null);
  const disqualified = evaluated.filter(e => e.reason !== null);

  qualifying.sort((a, b) => {
    if (orderBy === 'points') {
      if (b.score !== a.score) return b.score - a.score;
      if (a.count !== b.count) return a.count - b.count;
    } else {
      if (a.count !== b.count) return a.count - b.count;
      if (b.score !== a.score) return b.score - a.score;
    }
    return a.scene.label.localeCompare(b.scene.label);
  });

  const ranked: RankedScene[] = qualifying.map((e, i) => ({
    id: e.scene.id,
    name: e.scene.label,
    status: i === 0 ? 'wins' : 'ranked',
    rank: i === 0 ? undefined : i + 1,
    count: e.count,
    score: e.score,
  }));

  const out: RankedScene[] = disqualified
    .sort((a, b) => a.scene.label.localeCompare(b.scene.label))
    .map(e => ({
      id: e.scene.id,
      name: e.scene.label,
      status: 'out' as const,
      count: e.count,
      score: e.score,
      reason: e.reason!,
    }));

  return [...ranked, ...out];
}

/** The winning scene of a ranking, or null if nothing qualifies. */
export function winnerOf(ranked: RankedScene[]): RankedScene | null {
  return ranked.find(s => s.status === 'wins') ?? null;
}
