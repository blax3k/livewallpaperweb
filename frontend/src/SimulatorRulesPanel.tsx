import { useMemo, useState } from 'react';
import type { RuleDefinition, RuleGroup, FlagDefinition } from './api';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './components/ui/dropdown-menu';

export const COMBO_CONDITION_TYPES = new Set(['flag_active', 'flag_inactive', 'time_since_flag_change']);

function isCombo(rule: RuleDefinition): boolean {
  return (rule.conditions ?? []).some(group => group.checks.some(c => COMBO_CONDITION_TYPES.has(c.type)));
}

function setsLabel(rule: RuleDefinition, flagsById: Map<string, FlagDefinition>): string | null {
  const flagIds = [...new Set((rule.actions ?? []).map(a => a.flagId).filter((id): id is string => !!id))];
  if (flagIds.length === 0) return null;
  return flagIds.map(id => flagsById.get(id)?.name || id).join(', ');
}

interface RuleRowMenuProps {
  rule: RuleDefinition;
  groups: RuleGroup[];
  onRename: () => void;
  onMove: (groupName: string | undefined) => void;
  onNewGroup: () => void;
  onRemove: () => void;
}

function RuleRowMenu({ rule, groups, onRename, onMove, onNewGroup, onRemove }: RuleRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="simulator-rules-row__menu-btn" onClick={e => e.stopPropagation()}>⋯</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onRename}>✎ Rename…</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>⇄ Move to group</DropdownMenuSubTrigger>
          <DropdownMenuSubContent onClick={e => e.stopPropagation()}>
            {groups.map(g => (
              <DropdownMenuItem key={g.id} onSelect={() => onMove(g.name)}>
                {rule.group === g.name ? '✓ ' : ''}{g.name}{rule.group === g.name ? ' (current)' : ''}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onMove(undefined)}>
              {!rule.group ? '✓ ' : ''}Ungrouped{!rule.group ? ' (current)' : ''}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onNewGroup}>+ New group…</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={onRemove}>✕ Remove…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RuleRow({
  rule, flagsById, groups, onClick, onRename, onMove, onNewGroup, onRemove,
}: {
  rule: RuleDefinition;
  flagsById: Map<string, FlagDefinition>;
  groups: RuleGroup[];
  onClick: () => void;
  onRename: () => void;
  onMove: (groupName: string | undefined) => void;
  onNewGroup: () => void;
  onRemove: () => void;
}) {
  const sets = setsLabel(rule, flagsById);
  return (
    <div className="simulator-rules-row" onClick={onClick}>
      {rule.oneShot && <span className="simulator-rules-row__lock" title="Fires only once, ever">🔒</span>}
      {isCombo(rule) && <span className="simulator-rules-row__combo" title="Reads other flags">⛓</span>}
      <span className="simulator-rules-row__name">{rule.name || rule.id}</span>
      <span className="simulator-rules-row__sets">
        {sets ? `→ ${sets}` : <span className="simulator-rules-row__unused">Unused</span>}
      </span>
      <RuleRowMenu rule={rule} groups={groups} onRename={onRename} onMove={onMove} onNewGroup={onNewGroup} onRemove={onRemove} />
    </div>
  );
}

function GroupHeaderMenu({ onAddRule, onRename, onRemove }: { onAddRule: () => void; onRename: () => void; onRemove: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="simulator-rules-group__menu-btn" onClick={e => e.stopPropagation()}>⋯</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onRename}>✎ Rename group…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={onRemove}>✕ Remove group…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface RuleGroupSectionProps {
  title: string;
  count: number;
  ungrouped?: boolean;
  onAdd?: () => void;
  onRenameGroup?: () => void;
  onRemoveGroup?: () => void;
  children: React.ReactNode;
}

function RuleGroupSection({ title, count, ungrouped, onAdd, onRenameGroup, onRemoveGroup, children }: RuleGroupSectionProps) {
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
        {ungrouped && <span className="simulator-rules-group__hint">rules with no group</span>}
        {onAdd && (
          <button
            className="simulator-rules-group__add"
            onClick={e => { e.stopPropagation(); onAdd(); }}
          >
            +
          </button>
        )}
        {!ungrouped && onRenameGroup && onRemoveGroup && (
          <GroupHeaderMenu onAddRule={() => onAdd?.()} onRename={onRenameGroup} onRemove={onRemoveGroup} />
        )}
      </div>
      {open && <div className="simulator-rules-group__rows">{children}</div>}
    </div>
  );
}

interface SimulatorRulesPanelProps {
  rules: RuleDefinition[];
  groups: RuleGroup[];
  flagsById: Map<string, FlagDefinition>;
  onNewRule: (presetGroup?: string) => void;
  onSelectRule: (index: number) => void;
  onRenameRule: (rule: RuleDefinition) => void;
  onMoveRule: (rule: RuleDefinition, groupName: string | undefined) => void;
  onNewGroupForRule: (rule: RuleDefinition) => void;
  onRemoveRule: (rule: RuleDefinition) => void;
  onNewGroup: () => void;
  onRenameGroup: (group: RuleGroup) => void;
  onRemoveGroup: (group: RuleGroup) => void;
}

export function SimulatorRulesPanel({
  rules, groups, flagsById, onNewRule, onSelectRule, onRenameRule, onMoveRule, onNewGroupForRule, onRemoveRule, onNewGroup, onRenameGroup, onRemoveGroup,
}: SimulatorRulesPanelProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const matchingGroupNames = useMemo(() => {
    if (!query) return null;
    return new Set(groups.filter(g => g.name.toLowerCase().includes(query)).map(g => g.name));
  }, [groups, query]);

  const filteredRules = useMemo(() => {
    if (!query) return rules;
    return rules.filter(r => {
      if ((r.name || r.id).toLowerCase().includes(query)) return true;
      const groupName = r.group?.trim();
      return !!groupName && matchingGroupNames!.has(groupName);
    });
  }, [rules, query, matchingGroupNames]);

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
  const visibleGroups = useMemo(() => {
    if (!query) return groups;
    return groups.filter(g => matchingGroupNames!.has(g.name) || (byGroup.get(g.name)?.length ?? 0) > 0);
  }, [groups, query, matchingGroupNames, byGroup]);
  const showUngrouped = !query || ungrouped.length > 0;
  const noSearchResults = !!query && visibleGroups.length === 0 && !showUngrouped;

  return (
    <div className="simulator-panel simulator-panel--rules">
      <div className="simulator-rules-header">
        <span className="simulator-rules-header__title">
          <span className="simulator-rules-header__dot" />
          Rules
        </span>
        <span className="simulator-rules-header__count">{rules.length} rules · {groups.length + 1} groups</span>
        <div className="simulator-rules-header__actions">
          <div className="simulator-rules-header__search-wrap">
            <input
              className="simulator-rules-header__search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search rules"
            />
            {search !== '' && (
              <button
                className="simulator-rules-header__search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <button className="simulator-rules-header__new-group-btn" onClick={onNewGroup}>+ New group</button>
          <button className="simulator-rules-header__new-btn" onClick={() => onNewRule()}>+ New rule</button>
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
      ) : noSearchResults ? (
        <p className="simulator-empty">No rules match &quot;{search.trim()}&quot;.</p>
      ) : (
        <div className="simulator-rules-list">
          {visibleGroups.map(group => (
            <RuleGroupSection
              key={group.id}
              title={group.name}
              count={(byGroup.get(group.name) ?? []).length}
              onAdd={() => onNewRule(group.name)}
              onRenameGroup={() => onRenameGroup(group)}
              onRemoveGroup={() => onRemoveGroup(group)}
            >
              {(byGroup.get(group.name) ?? []).map(({ rule, index }) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  flagsById={flagsById}
                  groups={groups}
                  onClick={() => onSelectRule(index)}
                  onRename={() => onRenameRule(rule)}
                  onMove={groupName => onMoveRule(rule, groupName)}
                  onNewGroup={() => onNewGroupForRule(rule)}
                  onRemove={() => onRemoveRule(rule)}
                />
              ))}
            </RuleGroupSection>
          ))}
          {showUngrouped && (
            <RuleGroupSection title="Ungrouped" count={ungrouped.length} ungrouped onAdd={() => onNewRule()}>
              {ungrouped.map(({ rule, index }) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  flagsById={flagsById}
                  groups={groups}
                  onClick={() => onSelectRule(index)}
                  onRename={() => onRenameRule(rule)}
                  onMove={groupName => onMoveRule(rule, groupName)}
                  onNewGroup={() => onNewGroupForRule(rule)}
                  onRemove={() => onRemoveRule(rule)}
                />
              ))}
            </RuleGroupSection>
          )}
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
