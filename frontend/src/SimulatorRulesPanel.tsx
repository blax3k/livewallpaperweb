import { CollapsibleGroup } from './components/CollapsibleGroup';
import type { RuleDefinition, FlagDefinition } from './api';
import type { RuleCondition } from '@livewallpaper/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number | undefined): string {
  return String(n ?? 0).padStart(2, '0');
}

function flagLabel(flagId: string | undefined, flagsById: Map<string, FlagDefinition>): string {
  if (!flagId) return '(no flag)';
  return flagsById.get(flagId)?.name || flagId;
}

function summarizeCondition(c: RuleCondition, flagsById: Map<string, FlagDefinition>): string {
  switch (c.type) {
    case 'flag_active': return `${flagLabel(c.flagId, flagsById)} active`;
    case 'flag_inactive': return `${flagLabel(c.flagId, flagsById)} inactive`;
    case 'time_of_day': return `time ${pad(c.startHour)}:00–${pad(c.endHour)}:00`;
    case 'day_of_week': return `day ${(c.daysOfWeek ?? []).map(d => DAY_LABELS[d]).join(',') || '—'}`;
    case 'scene_count': return `scene views ${c.operator ?? '>='} ${c.intValue ?? 0}`;
    case 'install_duration_hours': return `install age ${c.operator ?? '>='} ${c.intValue ?? 0}h`;
    case 'time_since_flag_change': return `${flagLabel(c.flagId, flagsById)} ${c.flagChangeType ?? 'activated'} ${c.operator ?? '>='} ${c.intValue ?? 0}h ago`;
    default: return c.type;
  }
}

function summarizeConditions(rule: RuleDefinition, flagsById: Map<string, FlagDefinition>): string {
  const group = rule.conditions;
  if (!group || group.checks.length === 0) return 'always';
  const joiner = group.operator === 'OR' ? ' or ' : ' + ';
  return group.checks.map(c => summarizeCondition(c, flagsById)).join(joiner);
}

interface SimulatorRulesPanelProps {
  rules: RuleDefinition[];
  flagsById: Map<string, FlagDefinition>;
  onSelectRule: (index: number) => void;
  onNewRule: () => void;
}

export function SimulatorRulesPanel({ rules, flagsById, onSelectRule, onNewRule }: SimulatorRulesPanelProps) {
  return (
    <div className="simulator-panel simulator-panel--rules">
      <div className="simulator-panel__header">
        <span>Rules · {rules.length}</span>
        <span className="simulator-panel__search">⌕</span>
      </div>
      <CollapsibleGroup title="RULES" count={rules.length}>
        {rules.length === 0 && <p className="simulator-empty">No rules defined.</p>}
        {rules.map((rule, i) => (
          <div
            className="simulator-rule-row"
            key={rule.id}
            title={rule.name || undefined}
            onClick={() => onSelectRule(i)}
          >
            {rule.oneShot
              ? <span className="simulator-rule-row__lock">🔒</span>
              : <span className="simulator-rule-row__dot" />}
            <span className="simulator-rule-row__condition">{summarizeConditions(rule, flagsById)}</span>
            <span className="simulator-rule-row__name">{rule.name || undefined}</span>
          </div>
        ))}
      </CollapsibleGroup>
      <span className="simulator-new-rule" onClick={onNewRule}>+ New rule</span>
    </div>
  );
}
