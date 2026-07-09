import { describe, it, expect } from '@jest/globals';
import type { FlagDefinition, RuleDefinition } from '@livewallpaper/types';
import { evaluateCondition, evaluateConditions, resolveWorldState, runRules } from './ruleEngine';

const clock = { currentHour: 12, dayOfWeekNum: 2, installHours: 10 * 24 + 12 };

describe('evaluateCondition', () => {
  it('checks flag_active / flag_inactive against the active set', () => {
    const ctx = { ...clock, activeFlags: new Set(['a']), sceneCounts: {}, flagChanges: {} };
    expect(evaluateCondition({ type: 'flag_active', flagId: 'a' }, ctx)).toBe(true);
    expect(evaluateCondition({ type: 'flag_active', flagId: 'b' }, ctx)).toBe(false);
    expect(evaluateCondition({ type: 'flag_inactive', flagId: 'b' }, ctx)).toBe(true);
    expect(evaluateCondition({ type: 'flag_inactive', flagId: 'a' }, ctx)).toBe(false);
  });

  it('handles time_of_day including overnight wrap', () => {
    const ctx = { ...clock, activeFlags: new Set<string>(), sceneCounts: {}, flagChanges: {} };
    expect(evaluateCondition({ type: 'time_of_day', startHour: 6, endHour: 18 }, ctx)).toBe(true);
    expect(evaluateCondition({ type: 'time_of_day', startHour: 13, endHour: 18 }, ctx)).toBe(false);
    // Overnight window 22-4 at hour 12 should not match.
    expect(evaluateCondition({ type: 'time_of_day', startHour: 22, endHour: 4 }, ctx)).toBe(false);
    expect(evaluateCondition({ type: 'time_of_day', startHour: 6, endHour: 23 }, { ...ctx, currentHour: 23 })).toBe(true);
    expect(evaluateCondition({ type: 'time_of_day', startHour: 22, endHour: 4 }, { ...ctx, currentHour: 1 })).toBe(true);
  });

  it('checks day_of_week membership', () => {
    const ctx = { ...clock, activeFlags: new Set<string>(), sceneCounts: {}, flagChanges: {} };
    expect(evaluateCondition({ type: 'day_of_week', daysOfWeek: [2, 3] }, ctx)).toBe(true);
    expect(evaluateCondition({ type: 'day_of_week', daysOfWeek: [0, 6] }, ctx)).toBe(false);
  });

  it('compares install_duration_hours with the given operator', () => {
    const ctx = { ...clock, activeFlags: new Set<string>(), sceneCounts: {}, flagChanges: {} };
    expect(evaluateCondition({ type: 'install_duration_hours', operator: '>=', intValue: 100 }, ctx)).toBe(true);
    expect(evaluateCondition({ type: 'install_duration_hours', operator: '<', intValue: 100 }, ctx)).toBe(false);
  });

  it('compares scene_count against tracked counts, defaulting to 0', () => {
    const ctx = { ...clock, activeFlags: new Set<string>(), sceneCounts: { forest: 3 }, flagChanges: {} };
    expect(evaluateCondition({ type: 'scene_count', sceneId: 'forest', operator: '>=', intValue: 3 }, ctx)).toBe(true);
    expect(evaluateCondition({ type: 'scene_count', sceneId: 'unseen', operator: '==', intValue: 0 }, ctx)).toBe(true);
  });

  it('computes time_since_flag_change relative to installHours, false if never changed', () => {
    const ctx = {
      ...clock,
      activeFlags: new Set<string>(),
      sceneCounts: {},
      flagChanges: { cat_appeared: { activatedAtHour: clock.installHours - 5 } },
    };
    expect(evaluateCondition(
      { type: 'time_since_flag_change', flagId: 'cat_appeared', flagChangeType: 'activated', operator: '>=', intValue: 5 },
      ctx,
    )).toBe(true);
    expect(evaluateCondition(
      { type: 'time_since_flag_change', flagId: 'cat_appeared', flagChangeType: 'deactivated', operator: '>=', intValue: 0 },
      ctx,
    )).toBe(false);
  });
});

describe('evaluateConditions', () => {
  const ctx = { ...clock, activeFlags: new Set(['morning']), sceneCounts: {}, flagChanges: {} };

  it('treats missing/empty condition groups as always matching', () => {
    expect(evaluateConditions(undefined, ctx)).toBe(true);
    expect(evaluateConditions([], ctx)).toBe(true);
  });

  it('ANDs checks within a group and ORs across groups', () => {
    const groups = [
      { operator: 'AND' as const, checks: [{ type: 'flag_active' as const, flagId: 'morning' }, { type: 'flag_active' as const, flagId: 'missing' }] },
      { operator: 'AND' as const, checks: [{ type: 'flag_active' as const, flagId: 'morning' }] },
    ];
    expect(evaluateConditions(groups, ctx)).toBe(true);
    expect(evaluateConditions([groups[0]], ctx)).toBe(false);
  });
});

describe('runRules', () => {
  it('applies actions from matching rules in order and skips fired oneShot rules', () => {
    const rules: RuleDefinition[] = [
      { id: 'r1', name: 'Set morning', actions: [{ type: 'activate_flag', flagId: 'morning' }] },
      {
        id: 'r2',
        name: 'Milestone',
        oneShot: true,
        conditions: [{ operator: 'AND', checks: [{ type: 'flag_active', flagId: 'morning' }] }],
        actions: [{ type: 'activate_flag', flagId: 'milestone' }],
      },
    ];
    const result = runRules({
      rules,
      clock,
      activeFlags: new Set(),
      flagChanges: {},
      firedOneShotRuleIds: new Set(),
    });
    expect(result.activeFlags.has('morning')).toBe(true);
    expect(result.activeFlags.has('milestone')).toBe(true);
    expect(result.firedOneShotRuleIds.has('r2')).toBe(true);
    expect(result.flagChanges.morning.activatedAtHour).toBe(clock.installHours);

    // Second pass: milestone already fired, deactivating morning shouldn't refire it.
    const rules2: RuleDefinition[] = [
      { id: 'r1', name: 'Clear morning', actions: [{ type: 'deactivate_flag', flagId: 'morning' }] },
      rules[1],
    ];
    const result2 = runRules({
      rules: rules2,
      clock,
      activeFlags: result.activeFlags,
      flagChanges: result.flagChanges,
      firedOneShotRuleIds: result.firedOneShotRuleIds,
    });
    expect(result2.activeFlags.has('morning')).toBe(false);
    expect(result2.activeFlags.has('milestone')).toBe(true); // untouched, still active from before
    expect(result2.flagChanges.morning.deactivatedAtHour).toBe(clock.installHours);
  });

  it('lets a later rule react to a flag an earlier rule just activated (combo)', () => {
    const rules: RuleDefinition[] = [
      { id: 'setter', name: 'Setter', actions: [{ type: 'activate_flag', flagId: 'a' }] },
      {
        id: 'combo',
        name: 'Combo',
        conditions: [{ operator: 'AND', checks: [{ type: 'flag_active', flagId: 'a' }] }],
        actions: [{ type: 'activate_flag', flagId: 'b' }],
      },
    ];
    const result = runRules({ rules, clock, activeFlags: new Set(), flagChanges: {}, firedOneShotRuleIds: new Set() });
    expect(result.activeFlags.has('b')).toBe(true);
  });
});

describe('resolveWorldState', () => {
  const flags: FlagDefinition[] = [
    { id: 'ch1', name: 'Chapter 1', isChapter: true, chapterOrder: 0 },
    { id: 'ch2', name: 'Chapter 2', isChapter: true, chapterOrder: 1 },
  ];

  it('forces exactly the selected chapter flag active, deactivating other chapters', () => {
    const result = resolveWorldState({
      rules: [],
      flags,
      chapterId: 'ch2',
      clock,
      activeFlags: new Set(['ch1']),
      flagChanges: {},
      firedOneShotRuleIds: new Set(),
    });
    expect(result.activeFlags.has('ch1')).toBe(false);
    expect(result.activeFlags.has('ch2')).toBe(true);
  });

  it('clears all chapter flags when chapterId is null', () => {
    const result = resolveWorldState({
      rules: [],
      flags,
      chapterId: null,
      clock,
      activeFlags: new Set(['ch1']),
      flagChanges: {},
      firedOneShotRuleIds: new Set(),
    });
    expect(result.activeFlags.has('ch1')).toBe(false);
    expect(result.activeFlags.has('ch2')).toBe(false);
  });
});
