import type { Scene, Sprite, SpriteModification, SlotOption } from '@livewallpaper/types';
import { evaluateConditions, type WorldState } from './ruleEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Seeded RNG (portable — must match the Kotlin runtime bit-for-bit; see the spec §5.4).
// All 32-bit integer math: Math.imul wraps like Kotlin Int multiply, >>> like ushr.
// ─────────────────────────────────────────────────────────────────────────────

/** FNV-1a string hash → unsigned 32-bit integer. */
export function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Derive a per-slot seed so each slot picks independently but reproducibly within a wake. */
export function seedFor(wakeSeed: number, sceneId: string, slotId: string): number {
  return hash32(`${wakeSeed}:${sceneId}:${slotId}`);
}

/** mulberry32 PRNG → function yielding floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded weighted pick. Weight defaults to 1; the trailing return guards floating-point drift. */
export function weightedPick<T extends { weight?: number }>(items: T[], rng: () => number): T {
  const total = items.reduce((s, o) => s + (o.weight ?? 1), 0);
  let r = rng() * total;
  for (const o of items) {
    r -= o.weight ?? 1;
    if (r < 0) return o;
  }
  return items[items.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolver
// ─────────────────────────────────────────────────────────────────────────────

/** Apply one modification in place, reusing the sprite-condition modification vocabulary. */
function applyModification(sprite: Sprite, mod: SpriteModification): void {
  switch (mod.type) {
    // `visible` has no field on Sprite yet — how the renderer treats a hidden base sprite is an
    // open decision (spec §10.5). No-op for now so overrides that only tweak geometry/texture work.
    case 'visible':
      break;
    case 'texture':
      if (mod.textureResource != null) sprite.textureResource = mod.textureResource;
      break;
    case 'texture_coordinates':
      if (mod.texCoordinates) sprite.texCoordinates = [...mod.texCoordinates];
      break;
    case 'position':
      if (mod.positionX != null) sprite.positionX = mod.positionX;
      if (mod.positionY != null) sprite.positionY = mod.positionY;
      break;
    case 'parallax':
      if (mod.parallaxMultiplier != null) sprite.parallaxMultiplier = mod.parallaxMultiplier;
      break;
    case 'size':
      if (mod.width != null) sprite.width = mod.width;
      if (mod.height != null) sprite.height = mod.height;
      break;
  }
}

/**
 * Assemble a concrete `Sprite[]` for the current wake by picking one option per slot.
 *
 * Deterministic within a wake and identical on web and Android: `first-match` slots and base
 * sprites never use RNG, while `weighted-random` slots derive their pick from
 * `seedFor(wakeSeed, sceneId, slotId)` so a fresh `wakeSeed` reshuffles them. See the spec for
 * the precise algorithm (§4) and RNG (§5).
 *
 * `sceneId` is passed explicitly because it lives on `SceneDetail`, not on `Scene`.
 */
export function resolveScene(scene: Scene, sceneId: string, world: WorldState, wakeSeed: number): Sprite[] {
  const result: Sprite[] = scene.sprites.map(s => ({ ...s, texCoordinates: [...s.texCoordinates] }));
  // Mutable working copy so an option's emitsFlags become visible to *later* slots' conditions.
  const working = new Set(world.activeFlags);

  for (const slot of scene.slots ?? []) {
    const ctx = {
      ...world.clock,
      activeFlags: working,
      sceneCounts: world.sceneCounts,
      flagChanges: world.flagChanges,
    };
    const eligible = slot.options.filter(o =>
      evaluateConditions(o.conditions ? [o.conditions] : undefined, ctx),
    );
    if (eligible.length === 0) continue;

    let chosen: SlotOption;
    if (slot.selection === 'first-match') {
      chosen = eligible[0];
    } else {
      const rng = mulberry32(seedFor(wakeSeed, sceneId, slot.id));
      chosen = weightedPick(eligible, rng);
    }

    for (const f of chosen.emitsFlags ?? []) working.add(f);

    for (const ov of chosen.overrides ?? []) {
      const target = result.find(s => s.id === ov.targetSpriteId);
      if (target) for (const m of ov.modifications) applyModification(target, m);
    }
    for (const sp of chosen.sprites ?? []) {
      result.push({ ...sp, texCoordinates: [...sp.texCoordinates] });
    }
  }

  return result;
}
