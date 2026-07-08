import { useMemo, useState } from 'react';
import type { RuleDefinition, RuleGroup, FlagDefinition } from './api';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './components/ui/dropdown-menu';

const COMBO_CONDITION_TYPES = new Set(['flag_active', 'flag_inactive', 'time_since_flag_change']);

function isCombo(rule: RuleDefinition): boolean {
  return (rule.conditions ?? []).some(group => group.checks.some(c => COMBO_CONDITION_TYPES.has(c.type)));
}

function setsLabel(rule: RuleDefinition, flagsById: Map<string, FlagDefinition>): string | null {
  const flagIds = [...new Set((rule.actions ?? []).map(a => a.flagId).filter((id): id is string => !!id))];
  if (flagIds.length === 0) return null;
  return flagIds.map(id => flagsById.get(id)?.name || id).join(', ');
}

function RuleRowMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="simulator-rules-row__menu-btn" onClick={e => e.stopPropagation()}>⋯</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem>✎ Rename…</DropdownMenuItem>
        <DropdownMenuItem>⇄ Move to group ▸</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger>✕ Remove…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RuleRow({ rule, flagsById, onClick }: { rule: RuleDefinition; flagsById: Map<string, FlagDefinition>; onClick: () => void }) {
  const sets = setsLabel(rule, flagsById);
  return (
    <div className="simulator-rules-row" onClick={onClick}>
      {rule.oneShot && <span className="simulator-rules-row__lock" title="Fires only once, ever">🔒</span>}
      {isCombo(rule) && <span className="simulator-rules-row__combo" title="Reads other flags">⛓</span>}
      <span className="simulator-rules-row__name">{rule.name || rule.id}</span>
      <span className="simulator-rules-row__sets">
        {sets ? `→ ${sets}` : <span className="simulator-rules-row__unused">Unused</span>}
      </span>
      <RuleRowMenu />
    </div>
  );
}

function GroupHeaderMenu({ groupName }: { groupName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="simulator-rules-group__menu-btn" onClick={e => e.stopPropagation()}>⋯</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <div className="simulator-rules-group__menu-caption">Group &quot;{groupName}&quot;</div>
        <DropdownMenuItem>+ Add rule to group</DropdownMenuItem>
        <DropdownMenuItem>✎ Rename group…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger>✕ Remove group…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RuleGroupSectionProps {
  title: string;
  count: number;
  ungrouped?: boolean;
  onAdd?: () => void;
  children: React.ReactNode;
}

function RuleGroupSection({ title, count, ungrouped, onAdd, children }: RuleGroupSectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="simulator-rules-group">
      <div
        className={`simulator-rules-group__header ${ungrouped ? 'simulator-rules-group__header--ungrouped' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="simulator-rules-group__caret">{open ? '▾' : '▸'}</span>
        <span className="simulator-rules-group__name">{title}</span>
        <span className="simulator-rules-group__count">{count}</span>
        {ungrouped && <span className="simulator-rules-group__hint">— rules with no group · can&apos;t be renamed or removed</span>}
        {onAdd && (
          <button
            className="simulator-rules-group__add"
            onClick={e => { e.stopPropagation(); onAdd(); }}
          >
            +
          </button>
        )}
        {!ungrouped && <GroupHeaderMenu groupName={title} />}
      </div>
      {open && <div className="simulator-rules-group__rows">{children}</div>}
    </div>
  );
}

interface SimulatorRulesPanelProps {
  rules: RuleDefinition[];
  groups: RuleGroup[];
  flagsById: Map<string, FlagDefinition>;
  onNewRule: () => void;
  onSelectRule: (index: number) => void;
}

export function SimulatorRulesPanel({ rules, groups, flagsById, onNewRule, onSelectRule }: SimulatorRulesPanelProps) {
  const [search, setSearch] = useState('');

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter(r => (r.name || r.id).toLowerCase().includes(q));
  }, [rules, search]);

  const { byGroup, ungrouped } = useMemo(() => {
    const byGroup = new Map<string, { rule: RuleDefinition; index: number }[]>();
    for (const group of groups) byGroup.set(group.name, []);
    const ungrouped: { rule: RuleDefinition; index: number }[] = [];
    filteredRules.forEach(rule => {
      const index = rules.indexOf(rule);
      const groupName = rule.group?.trim();
      if (groupName && byGroup.has(groupName)) {
        byGroup.get(groupName)!.push({ rule, index });
      } else {
        ungrouped.push({ rule, index });
      }
    });
    return { byGroup, ungrouped };
  }, [filteredRules, rules, groups]);

  const isEmpty = rules.length === 0 && groups.length === 0;

  return (
    <div className="simulator-panel simulator-panel--rules">
      <div className="simulator-rules-header">
        <span className="simulator-rules-header__title">
          <span className="simulator-rules-header__dot" />
          Rules
        </span>
        <span className="simulator-rules-header__count">{rules.length} rules · {groups.length + 1} groups</span>
        <div className="simulator-rules-header__actions">
          <input
            className="simulator-rules-header__search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search rules"
          />
          <button className="simulator-rules-header__new-btn" onClick={onNewRule}>+ New rule</button>
        </div>
      </div>

      {!isEmpty && (
        <div className="simulator-rules-columns">
          <span>Rule</span>
          <span className="simulator-rules-columns__sets">Sets</span>
        </div>
      )}

      {isEmpty ? (
        <p className="simulator-empty">No rules defined.</p>
      ) : (
        <div className="simulator-rules-list">
          {groups.map(group => (
            <RuleGroupSection key={group.id} title={group.name} count={(byGroup.get(group.name) ?? []).length}>
              {(byGroup.get(group.name) ?? []).map(({ rule, index }) => (
                <RuleRow key={rule.id} rule={rule} flagsById={flagsById} onClick={() => onSelectRule(index)} />
              ))}
            </RuleGroupSection>
          ))}
          <RuleGroupSection title="Ungrouped" count={ungrouped.length} ungrouped onAdd={onNewRule}>
            {ungrouped.map(({ rule, index }) => (
              <RuleRow key={rule.id} rule={rule} flagsById={flagsById} onClick={() => onSelectRule(index)} />
            ))}
          </RuleGroupSection>
        </div>
      )}

      <div className="simulator-rules-legend">
        <span className="simulator-rules-legend__combo">⛓</span>
        combo of flags
        <span className="simulator-rules-legend__lock">🔒</span>
        fires once
        <span className="simulator-rules-legend__hint">⋯ opens rename · move · remove</span>
      </div>
    </div>
  );
}
