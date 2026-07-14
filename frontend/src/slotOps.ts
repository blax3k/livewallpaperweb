import type { SceneSlot, SlotOption, RuleConditionGroup, Sprite } from '@livewallpaper/types';

// Pure, immutable helpers for authoring a scene's slots. The editor keeps the richer
// @livewallpaper/types slot model but only ever writes the "equal odds" subset the design calls
// for: selection is always weighted-random with default (equal) weights, and an option's
// eligibility is a single AND group of flag gates — flag_active for "Show when", flag_inactive
// for "Hide when". See the slot design handoff.

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Default baked sprite for a freshly added option — a 5×5 sprite at the origin (matches the
 *  base-sprite add defaults). Position/size are refined later on the canvas. */
function createOptionSprite(textureResource: string, name: string): Sprite {
  return {
    id: uuid(),
    name,
    textureResource,
    positionX: 0,
    positionY: 0,
    width: 5,
    height: 5,
    parallaxMultiplier: 1,
    texCoordinates: [0, 1, 0, 0, 1, 1, 1, 0],
  };
}

/** The pinned, non-removable empty option — resolves to no image, always eligible, no gates. */
export function createNoneOption(): SlotOption {
  return { id: uuid(), name: 'none', sprites: [] };
}

export function createSlot(name: string): SceneSlot {
  return { id: uuid(), name, selection: 'weighted-random', options: [createNoneOption()] };
}

export function createOptionFromTexture(textureResource: string, name: string): SlotOption {
  return { id: uuid(), name, sprites: [createOptionSprite(textureResource, name)] };
}

/** The "none" row: an option that contributes no image. There is at most one per slot. */
export function isNoneOption(option: SlotOption): boolean {
  return !option.sprites || option.sprites.length === 0;
}

export function getShowFlagIds(option: SlotOption): string[] {
  return (option.conditions?.checks ?? [])
    .filter(c => c.type === 'flag_active' && c.flagId)
    .map(c => c.flagId!) as string[];
}

export function getHideFlagIds(option: SlotOption): string[] {
  return (option.conditions?.checks ?? [])
    .filter(c => c.type === 'flag_inactive' && c.flagId)
    .map(c => c.flagId!) as string[];
}

/** Rebuild an option's condition group from its Show-when (require) and Hide-when (exclude) flags.
 *  Eligible ⇔ all show flags active AND all hide flags inactive, so both collapse into one AND
 *  group. Returns undefined when there are no gates (always eligible). */
export function buildConditions(showFlagIds: string[], hideFlagIds: string[]): RuleConditionGroup | undefined {
  if (showFlagIds.length === 0 && hideFlagIds.length === 0) return undefined;
  return {
    operator: 'AND',
    checks: [
      ...showFlagIds.map(flagId => ({ type: 'flag_active' as const, flagId })),
      ...hideFlagIds.map(flagId => ({ type: 'flag_inactive' as const, flagId })),
    ],
  };
}

// ── Immutable array updates ──────────────────────────────────────────────────

export function mapSlot(slots: SceneSlot[], slotId: string, fn: (slot: SceneSlot) => SceneSlot): SceneSlot[] {
  return slots.map(s => (s.id === slotId ? fn(s) : s));
}

export function mapOption(
  slots: SceneSlot[],
  slotId: string,
  optionId: string,
  fn: (option: SlotOption) => SlotOption,
): SceneSlot[] {
  return mapSlot(slots, slotId, slot => ({
    ...slot,
    options: slot.options.map(o => (o.id === optionId ? fn(o) : o)),
  }));
}

/** Set an option's gate flags, keeping the pinned none option gate-free. */
export function setOptionGates(
  slots: SceneSlot[],
  slotId: string,
  optionId: string,
  showFlagIds: string[],
  hideFlagIds: string[],
): SceneSlot[] {
  return mapOption(slots, slotId, optionId, o => ({ ...o, conditions: buildConditions(showFlagIds, hideFlagIds) }));
}
