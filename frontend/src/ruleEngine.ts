import type { FlagDefinition, RuleCondition, RuleConditionGroup, RuleDefinition } from '@livewallpaper/types';

/** Hour (in virtual install-hours) a flag was last activated/deactivated. */
export interface FlagChangeRecord {
  activatedAtHour?: number;
  deactivatedAtHour?: number;
}

export type FlagChangeHistory = Record<string, FlagChangeRecord>;

export interface WorldClock {
  /** 0-23, hour of day. */
  currentHour: number;
  /** 0-1439, minutes since midnight — drives minute-precise time_of_day windows. */
  currentMinuteOfDay: number;
  /** 0=Sun … 6=Sat, matching RuleCondition.daysOfWeek. */
  dayOfWeekNum: number;
  /** Total hours elapsed since install. */
  installHours: number;
}

interface EngineContext extends WorldClock {
  activeFlags: Set<string>;
  sceneCounts: Record<string, number>;
  flagChanges: FlagChangeHistory;
}

function compare(operator: RuleCondition['operator'], a: number, b: number): boolean {
  switch (operator) {
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '==': return a === b;
    case '>': return a > b;
    case '<': return a < b;
    default: return false;
  }
}

export function evaluateCondition(check: RuleCondition, ctx: EngineContext): boolean {
  switch (check.type) {
    case 'flag_active':
      return check.flagId != null && ctx.activeFlags.has(check.flagId);
    case 'flag_inactive':
      return check.flagId != null && !ctx.activeFlags.has(check.flagId);
    case 'time_of_day': {
      const { startHour, endHour } = check;
      if (startHour == null || endHour == null) return false;
      // Half-open window [start, end) on the minute-of-day; end is exclusive and the range wraps
      // overnight when start > end. Minutes default to 0, so hour-only rules keep their old meaning.
      const start = startHour * 60 + (check.startMinute ?? 0);
      const end = endHour * 60 + (check.endMinute ?? 0);
      const cur = ctx.currentMinuteOfDay;
      return start <= end
        ? cur >= start && cur < end
        : cur >= start || cur < end;
    }
    case 'day_of_week':
      return check.daysOfWeek?.includes(ctx.dayOfWeekNum) ?? false;
    case 'scene_count': {
      if (!check.sceneId || !check.operator || check.intValue == null) return false;
      return compare(check.operator, ctx.sceneCounts[check.sceneId] ?? 0, check.intValue);
    }
    case 'install_duration_hours': {
      if (!check.operator || check.intValue == null) return false;
      return compare(check.operator, ctx.installHours, check.intValue);
    }
    case 'time_since_flag_change': {
      if (!check.flagId || !check.operator || check.intValue == null || !check.flagChangeType) return false;
      const record = ctx.flagChanges[check.flagId];
      const changedAtHour = check.flagChangeType === 'activated' ? record?.activatedAtHour : record?.deactivatedAtHour;
      if (changedAtHour == null) return false;
      return compare(check.operator, ctx.installHours - changedAtHour, check.intValue);
    }
    default:
      return false;
  }
}

function evaluateConditionGroup(group: RuleConditionGroup, ctx: EngineContext): boolean {
  return group.operator === 'AND'
    ? group.checks.every(c => evaluateCondition(c, ctx))
    : group.checks.some(c => evaluateCondition(c, ctx));
}

/** Empty/omitted condition groups always match (unconditional rules). */
export function evaluateConditions(groups: RuleConditionGroup[] | undefined, ctx: EngineContext): boolean {
  if (!groups || groups.length === 0) return true;
  return groups.some(g => evaluateConditionGroup(g, ctx));
}

/**
 * A snapshot of everything a condition needs to be evaluated: the world clock plus the
 * mutable-ish flag/scene state. Used by consumers (e.g. the simulator preview) that need to
 * evaluate conditions outside a full rule pass.
 */
export interface WorldState {
  clock: WorldClock;
  activeFlags: ReadonlySet<string>;
  sceneCounts: Record<string, number>;
  flagChanges: FlagChangeHistory;
}

/**
 * Whether a single sprite condition-block group matches the given world. An omitted group
 * always matches (unconditional / default override block), consistent with runtime behavior.
 */
export function matchesConditionGroup(group: RuleConditionGroup | undefined, world: WorldState): boolean {
  const ctx: EngineContext = {
    ...world.clock,
    activeFlags: new Set(world.activeFlags),
    sceneCounts: world.sceneCounts,
    flagChanges: world.flagChanges,
  };
  return evaluateConditions(group ? [group] : undefined, ctx);
}

export interface RunRulesInput {
  rules: RuleDefinition[];
  clock: WorldClock;
  /** Flags active going into this evaluation pass (e.g. carried over from the previous wake). */
  activeFlags: ReadonlySet<string>;
  flagChanges: FlagChangeHistory;
  /** IDs of oneShot rules that have already fired at some point in this world's lifetime. */
  firedOneShotRuleIds: ReadonlySet<string>;
  sceneCounts?: Record<string, number>;
}

export interface RunRulesResult {
  activeFlags: Set<string>;
  flagChanges: FlagChangeHistory;
  firedOneShotRuleIds: Set<string>;
}

/**
 * Runs every rule once, in array order, mutating active flags as actions fire so that
 * later rules can react to flags set by earlier ones in the same pass (this is what the
 * editor's "combo" indicator refers to). oneShot rules that already fired are skipped.
 */
export function runRules({
  rules,
  clock,
  activeFlags,
  flagChanges,
  firedOneShotRuleIds,
  sceneCounts = {},
}: RunRulesInput): RunRulesResult {
  const nextActiveFlags = new Set(activeFlags);
  const nextFlagChanges: FlagChangeHistory = { ...flagChanges };
  const nextFired = new Set(firedOneShotRuleIds);
  const ctx: EngineContext = { ...clock, activeFlags: nextActiveFlags, flagChanges: nextFlagChanges, sceneCounts };

  for (const rule of rules) {
    if (rule.oneShot && nextFired.has(rule.id)) continue;
    if (!evaluateConditions(rule.conditions, ctx)) continue;

    for (const action of rule.actions) {
      if (!action.flagId) continue;
      if (action.type === 'activate_flag' && !nextActiveFlags.has(action.flagId)) {
        nextActiveFlags.add(action.flagId);
        nextFlagChanges[action.flagId] = { ...nextFlagChanges[action.flagId], activatedAtHour: clock.installHours };
      } else if (action.type === 'deactivate_flag' && nextActiveFlags.has(action.flagId)) {
        nextActiveFlags.delete(action.flagId);
        nextFlagChanges[action.flagId] = { ...nextFlagChanges[action.flagId], deactivatedAtHour: clock.installHours };
      }
    }

    if (rule.oneShot) nextFired.add(rule.id);
  }

  return { activeFlags: nextActiveFlags, flagChanges: nextFlagChanges, firedOneShotRuleIds: nextFired };
}

/** Reconciles chapter-flag state so exactly the selected chapter (if any) is active, then runs rules. */
export function resolveWorldState(input: RunRulesInput & { flags: FlagDefinition[]; chapterId: string | null }): RunRulesResult {
  const chapterIds = new Set(input.flags.filter(f => f.isChapter).map(f => f.id));
  const reconciled = new Set(input.activeFlags);
  for (const id of chapterIds) reconciled.delete(id);
  if (input.chapterId != null) reconciled.add(input.chapterId);

  return runRules({ ...input, activeFlags: reconciled });
}
