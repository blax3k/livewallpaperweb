import { describe, it, expect } from '@jest/globals';
import type { Scene, Sprite, SceneSlot, RuleConditionGroup } from '@livewallpaper/types';
import type { WorldState } from './ruleEngine';
import { hash32, seedFor, mulberry32, weightedPick, resolveScene } from './sceneResolver';

const world = (activeFlags: string[] = []): WorldState => ({
  clock: { currentHour: 12, currentMinuteOfDay: 12 * 60, dayOfWeekNum: 2, installHours: 240 },
  activeFlags: new Set(activeFlags),
  sceneCounts: {},
  flagChanges: {},
});

let spriteSeq = 0;
function sprite(overrides: Partial<Sprite> = {}): Sprite {
  spriteSeq += 1;
  return {
    id: overrides.id ?? `sprite-${spriteSeq}`,
    name: overrides.name ?? `sprite-${spriteSeq}`,
    height: 100,
    width: 100,
    parallaxMultiplier: 1,
    positionX: 0,
    positionY: 0,
    texCoordinates: [0, 1, 0, 0, 1, 1, 1, 0],
    textureResource: '/uploads/base.png',
    ...overrides,
  };
}

function scene(sprites: Sprite[], slots?: SceneSlot[]): Scene {
  return { sprites, slots, xFocus: 0.5, yFocus: 0.5 };
}

const flagActive = (flagId: string): RuleConditionGroup => ({ operator: 'AND', checks: [{ type: 'flag_active', flagId }] });

// ─────────────────────────────────────────────────────────────────────────────
// Cross-platform RNG test vectors — LOCKED. Android's hash32/mulberry32 must match these
// exactly (spec §5.4). Do not change these numbers without updating the Kotlin implementation.
// ─────────────────────────────────────────────────────────────────────────────
describe('portable RNG (locked cross-platform vectors)', () => {
  it('hash32("1:sceneA:cat") is stable', () => {
    expect(hash32('1:sceneA:cat')).toBe(3175594795);
    expect(seedFor(1, 'sceneA', 'cat')).toBe(3175594795);
  });

  it('mulberry32(seed) first three outputs are stable', () => {
    const rng = mulberry32(hash32('1:sceneA:cat'));
    expect(rng()).toBeCloseTo(0.4080464451108128, 15);
    expect(rng()).toBeCloseTo(0.8449235688894987, 15);
    expect(rng()).toBeCloseTo(0.7291417275555432, 15);
  });

  it('hash32 stays unsigned 32-bit', () => {
    expect(hash32('')).toBe(0x811c9dc5);
    expect(hash32('anything') >>> 0).toBe(hash32('anything'));
  });
});

describe('weightedPick', () => {
  it('honors relative weights over many draws', () => {
    const items = [{ id: 'a', weight: 3 }, { id: 'b', weight: 1 }];
    const rng = mulberry32(hash32('dist'));
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 4000; i++) counts[weightedPick(items, rng).id] += 1;
    // Roughly 3:1; generous bounds keep this from flaking.
    expect(counts.a).toBeGreaterThan(counts.b * 2);
  });

  it('defaults missing weight to 1', () => {
    const items: { id: string; weight?: number }[] = [{ id: 'a' }, { id: 'b' }];
    expect(weightedPick(items, () => 0).id).toBe('a');
    expect(weightedPick(items, () => 0.75).id).toBe('b');
  });
});

describe('resolveScene', () => {
  it('returns a copy of base sprites when there are no slots', () => {
    const base = [sprite({ id: 'bg' }), sprite({ id: 'char' })];
    const out = resolveScene(scene(base), 'sceneA', world(), 1);
    expect(out.map(s => s.id)).toEqual(['bg', 'char']);
    // Deep copy: mutating the result must not touch the source scene.
    out[0].texCoordinates[0] = 999;
    expect(base[0].texCoordinates[0]).toBe(0);
    expect(out[0]).not.toBe(base[0]);
  });

  it('first-match picks the first eligible option in array order', () => {
    const base = [sprite({ id: 'char' })];
    const slot: SceneSlot = {
      id: 'cat',
      name: 'cat',
      selection: 'first-match',
      options: [
        { id: 'gated', name: 'cat', conditions: flagActive('obtained_cat'), sprites: [sprite({ id: 'cat-sprite' })] },
        { id: 'none', name: 'none' },
      ],
    };
    // Gate closed → falls through to the unconditional "none" option (no sprites appended).
    expect(resolveScene(scene(base, [slot]), 'sceneA', world(), 1).map(s => s.id)).toEqual(['char']);
    // Gate open → cat option wins.
    expect(resolveScene(scene(base, [slot]), 'sceneA', world(['obtained_cat']), 1).map(s => s.id))
      .toEqual(['char', 'cat-sprite']);
  });

  it('skips a slot when no option is eligible', () => {
    const base = [sprite({ id: 'char' })];
    const slot: SceneSlot = {
      id: 'cat',
      name: 'cat',
      selection: 'first-match',
      options: [{ id: 'gated', name: 'cat', conditions: flagActive('nope'), sprites: [sprite({ id: 'cat-sprite' })] }],
    };
    expect(resolveScene(scene(base, [slot]), 'sceneA', world(), 1).map(s => s.id)).toEqual(['char']);
  });

  it('weighted-random is deterministic for a given wakeSeed and reshuffles across seeds', () => {
    const base = [sprite({ id: 'char' })];
    const slot: SceneSlot = {
      id: 'food',
      name: 'food',
      selection: 'weighted-random',
      options: [
        { id: 'noodles', name: 'noodles', sprites: [sprite({ id: 'noodles-sprite' })] },
        { id: 'sandwich', name: 'sandwich', sprites: [sprite({ id: 'sandwich-sprite' })] },
      ],
    };
    const pick = (seed: number) => resolveScene(scene(base, [slot]), 'sceneA', world(), seed).map(s => s.id)[1];
    // Stable within a wake.
    expect(pick(1)).toBe(pick(1));
    // At least one nearby seed picks the other option (variety across wakes).
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const distinct = new Set(seeds.map(pick));
    expect(distinct.size).toBe(2);
  });

  it('applies overrides to the matching base sprite by targetSpriteId', () => {
    const base = [sprite({ id: 'char', positionX: 0 })];
    const slot: SceneSlot = {
      id: 'pose',
      name: 'pose',
      selection: 'first-match',
      options: [{
        id: 'sandwich-pose',
        name: 'sandwich',
        overrides: [{ targetSpriteId: 'char', modifications: [{ type: 'position', positionX: 42, positionY: 7 }] }],
      }],
    };
    const out = resolveScene(scene(base, [slot]), 'sceneA', world(), 1);
    expect(out[0].positionX).toBe(42);
    expect(out[0].positionY).toBe(7);
    // Source scene untouched.
    expect(base[0].positionX).toBe(0);
  });

  it('emitsFlags from an earlier slot are visible to later slots only', () => {
    const base = [sprite({ id: 'char' })];
    const positionSlot: SceneSlot = {
      id: 'cat-pos',
      name: 'cat position',
      selection: 'first-match',
      options: [{ id: 'table', name: 'on table', emitsFlags: ['cat_on_table'], sprites: [sprite({ id: 'cat-table' })] }],
    };
    const reactSlot: SceneSlot = {
      id: 'cat-extra',
      name: 'cat extra',
      selection: 'first-match',
      options: [
        { id: 'plate', name: 'plate', conditions: flagActive('cat_on_table'), sprites: [sprite({ id: 'plate-sprite' })] },
        { id: 'none', name: 'none' },
      ],
    };
    // Later slot sees the emitted flag → plate appears.
    expect(resolveScene(scene(base, [positionSlot, reactSlot]), 'sceneA', world(), 1).map(s => s.id))
      .toEqual(['char', 'cat-table', 'plate-sprite']);
    // Order matters: if the reacting slot runs first, the flag isn't set yet → no plate.
    expect(resolveScene(scene(base, [reactSlot, positionSlot]), 'sceneA', world(), 1).map(s => s.id))
      .toEqual(['char', 'cat-table']);
  });

  it('draws base sprites first, then slot sprites in slot order', () => {
    const base = [sprite({ id: 'bg' })];
    const slotA: SceneSlot = { id: 'a', name: 'a', selection: 'first-match', options: [{ id: 'a1', name: 'a1', sprites: [sprite({ id: 'a-sprite' })] }] };
    const slotB: SceneSlot = { id: 'b', name: 'b', selection: 'first-match', options: [{ id: 'b1', name: 'b1', sprites: [sprite({ id: 'b-sprite' })] }] };
    expect(resolveScene(scene(base, [slotA, slotB]), 'sceneA', world(), 1).map(s => s.id))
      .toEqual(['bg', 'a-sprite', 'b-sprite']);
  });
});
