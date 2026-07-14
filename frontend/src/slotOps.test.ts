import {
  createSlot,
  createNoneOption,
  createOptionFromTexture,
  isNoneOption,
  getShowFlagIds,
  getHideFlagIds,
  buildConditions,
  setOptionGates,
  mapSlot,
} from './slotOps';
import { matchesConditionGroup, type WorldState } from './ruleEngine';

const world = (activeFlags: string[]): WorldState => ({
  clock: { currentHour: 0, currentMinuteOfDay: 0, dayOfWeekNum: 0, installHours: 0 },
  activeFlags: new Set(activeFlags),
  sceneCounts: {},
  flagChanges: {},
});

describe('slotOps', () => {
  it('creates a slot seeded with a pinned none option and equal-odds selection', () => {
    const slot = createSlot('cat');
    expect(slot.name).toBe('cat');
    expect(slot.selection).toBe('weighted-random');
    expect(slot.options).toHaveLength(1);
    expect(isNoneOption(slot.options[0])).toBe(true);
  });

  it('distinguishes the none option from an option that contributes a sprite', () => {
    expect(isNoneOption(createNoneOption())).toBe(true);
    expect(isNoneOption(createOptionFromTexture('/uploads/cat.png', 'cat'))).toBe(false);
  });

  it('bakes a default sprite (no weight written) for a textured option', () => {
    const option = createOptionFromTexture('/uploads/cat.png', 'napping');
    expect(option.weight).toBeUndefined();
    expect(option.sprites).toHaveLength(1);
    expect(option.sprites![0].textureResource).toBe('/uploads/cat.png');
  });

  it('round-trips Show-when / Hide-when flags through the AND condition group', () => {
    const group = buildConditions(['obtained_cat'], ['rainy_day']);
    expect(group).toEqual({
      operator: 'AND',
      checks: [
        { type: 'flag_active', flagId: 'obtained_cat' },
        { type: 'flag_inactive', flagId: 'rainy_day' },
      ],
    });
    const option = { id: 'o', name: 'x', conditions: group };
    expect(getShowFlagIds(option)).toEqual(['obtained_cat']);
    expect(getHideFlagIds(option)).toEqual(['rainy_day']);
  });

  it('drops the condition group entirely when there are no gates (always eligible)', () => {
    expect(buildConditions([], [])).toBeUndefined();
  });

  it('setOptionGates writes gates whose eligibility matches show(all)/hide(any) semantics', () => {
    let slots = [createSlot('cat')];
    const napping = createOptionFromTexture('/uploads/cat.png', 'napping');
    slots = mapSlot(slots, slots[0].id, s => ({ ...s, options: [...s.options, napping] }));

    slots = setOptionGates(slots, slots[0].id, napping.id, ['obtained_cat'], ['rainy_day']);
    const option = slots[0].options.find(o => o.id === napping.id)!;

    // eligible only when the show flag is active AND the hide flag is inactive
    expect(matchesConditionGroup(option.conditions, world(['obtained_cat']))).toBe(true);
    expect(matchesConditionGroup(option.conditions, world([]))).toBe(false);
    expect(matchesConditionGroup(option.conditions, world(['obtained_cat', 'rainy_day']))).toBe(false);
  });

  it('a gate-free option is always eligible', () => {
    const none = createNoneOption();
    expect(matchesConditionGroup(none.conditions, world([]))).toBe(true);
  });
});
