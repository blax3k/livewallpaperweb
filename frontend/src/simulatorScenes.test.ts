import { rankScenes, disqualifyReason, sceneScore, winnerOf, type QualifyContext, type RankableScene } from './simulatorScenes';
import type { SceneFlagDeclarations } from '@livewallpaper/types';

function scene(
  id: string,
  label: string,
  flags?: SceneFlagDeclarations,
): RankableScene {
  // name (the slug show-counts key on) mirrors id here so the count-keyed cases stay simple.
  return { id, name: id, label, ...(flags && { flags }) };
}

const ctxWith = (over: Partial<QualifyContext> = {}): QualifyContext => ({
  activeFlags: new Set<string>(),
  flagName: id => id,
  ...over,
});

describe('disqualifyReason', () => {
  it('flags a missing required flag by name', () => {
    const ctx = ctxWith({ flagName: id => (id === 'f1' ? 'Rainy' : id) });
    expect(disqualifyReason({ required: ['f1'] }, ctx)).toBe('needs Rainy');
  });

  it('flags an active excluded flag', () => {
    const ctx = ctxWith({ activeFlags: new Set(['f1']), flagName: () => 'Day' });
    expect(disqualifyReason({ excluded: ['f1'] }, ctx)).toBe('blocked by Day');
  });

  it('returns null when all declarations pass', () => {
    const ctx = ctxWith({ activeFlags: new Set(['req']) });
    expect(disqualifyReason({ required: ['req'], excluded: ['no'] }, ctx)).toBeNull();
  });
});

describe('sceneScore', () => {
  it('sums weights of active scored flags only', () => {
    const decl: SceneFlagDeclarations = { scored: [{ flagId: 'a', weight: 10 }, { flagId: 'b', weight: -5 }] };
    expect(sceneScore(decl, new Set(['a']))).toBe(10);
    expect(sceneScore(decl, new Set(['a', 'b']))).toBe(5);
    expect(sceneScore(decl, new Set())).toBe(0);
  });
});

describe('rankScenes', () => {
  it('orders qualifiers by points, then splits out disqualified scenes', () => {
    const scenes = [
      scene('low', 'Low', { scored: [{ flagId: 'x', weight: 5 }] }),
      scene('high', 'High', { scored: [{ flagId: 'x', weight: 20 }] }),
      scene('gone', 'Gone', { required: ['missing'] }),
    ];
    const ranked = rankScenes(scenes, 'points', ctxWith({ activeFlags: new Set(['x']) }), {});
    expect(ranked.map(r => [r.id, r.status, r.rank])).toEqual([
      ['high', 'wins', undefined],
      ['low', 'ranked', 2],
      ['gone', 'out', undefined],
    ]);
    expect(winnerOf(ranked)?.id).toBe('high');
  });

  it('orders qualifiers by least-shown count', () => {
    const scenes = [scene('a', 'A'), scene('b', 'B'), scene('c', 'C')];
    const ranked = rankScenes(scenes, 'least_shown', ctxWith(), { a: 10, b: 2, c: 7 });
    expect(ranked.map(r => r.id)).toEqual(['b', 'c', 'a']);
    expect(ranked[0].status).toBe('wins');
  });

  it('breaks point ties by fewer shows', () => {
    const scenes = [
      scene('seen', 'Seen', { scored: [{ flagId: 'x', weight: 10 }] }),
      scene('fresh', 'Fresh', { scored: [{ flagId: 'x', weight: 10 }] }),
    ];
    const ranked = rankScenes(scenes, 'points', ctxWith({ activeFlags: new Set(['x']) }), { seen: 9, fresh: 1 });
    expect(ranked.map(r => r.id)).toEqual(['fresh', 'seen']);
  });

  it('returns only out cards and no winner when nothing qualifies', () => {
    const scenes = [scene('a', 'A', { required: ['nope'] })];
    const ranked = rankScenes(scenes, 'points', ctxWith(), {});
    expect(ranked).toHaveLength(1);
    expect(ranked[0].status).toBe('out');
    expect(winnerOf(ranked)).toBeNull();
  });
});
