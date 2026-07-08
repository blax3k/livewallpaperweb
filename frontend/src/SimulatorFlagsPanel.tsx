import { useMemo, useState } from 'react';
import type { FlagDefinition, FlagGroup } from './api';
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

type UsageCounts = Record<string, { rules: number; scenes: number }>;

interface SimulatorFlagsPanelProps {
  flags: FlagDefinition[];
  groups: FlagGroup[];
  usageCounts: UsageCounts;
  onNewFlag: (presetGroup?: string) => void;
  onSelectFlag: (flag: FlagDefinition) => void;
  onRenameFlag: (flag: FlagDefinition) => void;
  onMoveFlag: (flag: FlagDefinition, groupName: string | undefined) => void;
  onNewGroupForFlag: (flag: FlagDefinition) => void;
  onRemoveFlag: (flag: FlagDefinition) => void;
  onNewGroup: () => void;
  onRenameGroup: (group: FlagGroup) => void;
  onRemoveGroup: (group: FlagGroup) => void;
}

function usageLabel(usage: { rules: number; scenes: number } | undefined): string | null {
  if (!usage) return null;
  const parts: string[] = [];
  if (usage.rules > 0) parts.push(`${usage.rules} rule${usage.rules === 1 ? '' : 's'}`);
  if (usage.scenes > 0) parts.push(`${usage.scenes} scene${usage.scenes === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

interface FlagRowMenuProps {
  flag: FlagDefinition;
  groups: FlagGroup[];
  onRename: () => void;
  onMove: (groupName: string | undefined) => void;
  onNewGroup: () => void;
  onRemove: () => void;
}

function FlagRowMenu({ flag, groups, onRename, onMove, onNewGroup, onRemove }: FlagRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="simulator-flags-row__menu-btn" onClick={e => e.stopPropagation()}>⋯</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onRename}>✎ Rename…</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>⇄ Move to group</DropdownMenuSubTrigger>
          <DropdownMenuSubContent onClick={e => e.stopPropagation()}>
            {groups.map(g => (
              <DropdownMenuItem key={g.id} onSelect={() => onMove(g.name)}>
                {flag.group === g.name ? '✓ ' : ''}{g.name}{flag.group === g.name ? ' (current)' : ''}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onMove(undefined)}>
              {!flag.group ? '✓ ' : ''}Ungrouped{!flag.group ? ' (current)' : ''}
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

function FlagRow({
  flag, usage, groups, onClick, onRename, onMove, onNewGroup, onRemove,
}: {
  flag: FlagDefinition;
  usage: { rules: number; scenes: number } | undefined;
  groups: FlagGroup[];
  onClick: () => void;
  onRename: () => void;
  onMove: (groupName: string | undefined) => void;
  onNewGroup: () => void;
  onRemove: () => void;
}) {
  const label = usageLabel(usage);
  return (
    <div className="simulator-flags-row" onClick={onClick}>
      <span className={`simulator-flags-row__dot ${flag.defaultActive ? 'simulator-flags-row__dot--on' : ''}`} />
      <span className="simulator-flags-row__name">{flag.name || flag.id}</span>
      <span className="simulator-flags-row__used">
        {label ?? <span className="simulator-flags-row__unused">Unused</span>}
      </span>
      <FlagRowMenu flag={flag} groups={groups} onRename={onRename} onMove={onMove} onNewGroup={onNewGroup} onRemove={onRemove} />
    </div>
  );
}

function GroupHeaderMenu({ onAddFlag, onRename, onRemove }: { onAddFlag: () => void; onRename: () => void; onRemove: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="simulator-flags-group__menu-btn" onClick={e => e.stopPropagation()}>⋯</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onSelect={onAddFlag}>+ Add flag to group</DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>✎ Rename group…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={onRemove}>✕ Remove group…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface FlagGroupSectionProps {
  title: string;
  count: number;
  ungrouped?: boolean;
  onAdd?: () => void;
  onRenameGroup?: () => void;
  onRemoveGroup?: () => void;
  children: React.ReactNode;
}

function FlagGroupSection({ title, count, ungrouped, onAdd, onRenameGroup, onRemoveGroup, children }: FlagGroupSectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="simulator-flags-group">
      <div
        className={`simulator-flags-group__header ${ungrouped ? 'simulator-flags-group__header--ungrouped' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="simulator-flags-group__caret">{open ? '▾' : '▸'}</span>
        <span className="simulator-flags-group__name">{title}</span>
        <span className="simulator-flags-group__count">{count}</span>
        {ungrouped && <span className="simulator-flags-group__hint"></span>}
        {onAdd && (
          <button
            className="simulator-flags-group__add"
            onClick={e => { e.stopPropagation(); onAdd(); }}
          >
            +
          </button>
        )}
        {!ungrouped && onRenameGroup && onRemoveGroup && (
          <GroupHeaderMenu onAddFlag={() => onAdd?.()} onRename={onRenameGroup} onRemove={onRemoveGroup} />
        )}
      </div>
      {open && <div className="simulator-flags-group__rows">{children}</div>}
    </div>
  );
}

export function SimulatorFlagsPanel({
  flags, groups, usageCounts, onNewFlag, onSelectFlag, onRenameFlag, onMoveFlag, onNewGroupForFlag, onRemoveFlag, onNewGroup, onRenameGroup, onRemoveGroup,
}: SimulatorFlagsPanelProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const matchingGroupNames = useMemo(() => {
    if (!query) return null;
    return new Set(groups.filter(g => g.name.toLowerCase().includes(query)).map(g => g.name));
  }, [groups, query]);

  const filteredFlags = useMemo(() => {
    if (!query) return flags;
    return flags.filter(f => {
      if ((f.name || f.id).toLowerCase().includes(query)) return true;
      const groupName = f.group?.trim();
      return !!groupName && matchingGroupNames!.has(groupName);
    });
  }, [flags, query, matchingGroupNames]);

  const { byGroup, ungrouped } = useMemo(() => {
    const byGroup = new Map<string, FlagDefinition[]>();
    for (const group of groups) byGroup.set(group.name, []);
    const ungrouped: FlagDefinition[] = [];
    for (const flag of filteredFlags) {
      const groupName = flag.group?.trim();
      if (groupName && byGroup.has(groupName)) {
        byGroup.get(groupName)!.push(flag);
      } else {
        ungrouped.push(flag);
      }
    }
    return { byGroup, ungrouped };
  }, [filteredFlags, groups]);

  const isEmpty = flags.length === 0 && groups.length === 0;
  const visibleGroups = useMemo(() => {
    if (!query) return groups;
    return groups.filter(g => matchingGroupNames!.has(g.name) || (byGroup.get(g.name)?.length ?? 0) > 0);
  }, [groups, query, matchingGroupNames, byGroup]);
  const showUngrouped = !query || ungrouped.length > 0;
  const noSearchResults = !!query && visibleGroups.length === 0 && !showUngrouped;

  return (
    <div className="simulator-panel simulator-panel--flags">
      <div className="simulator-flags-header">
        <span className="simulator-flags-header__title">
          <span className="simulator-flags-header__dot" />
          Flags
        </span>
        <span className="simulator-flags-header__count">{flags.length} flags · {groups.length + 1} groups</span>
        <div className="simulator-flags-header__actions">
          <div className="simulator-flags-header__search-wrap">
            <input
              className="simulator-flags-header__search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search flags"
            />
            {search !== '' && (
              <button
                className="simulator-flags-header__search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <button className="simulator-flags-header__new-group-btn" onClick={onNewGroup}>+ New group</button>
          <button className="simulator-flags-header__new-btn" onClick={() => onNewFlag()}>+ New flag</button>
        </div>
      </div>

      {!isEmpty && (
        <div className="simulator-flags-columns">
          <span>Flag</span>
          <span className="simulator-flags-columns__used">Used by</span>
        </div>
      )}

      {isEmpty ? (
        <p className="simulator-empty">No flags defined.</p>
      ) : noSearchResults ? (
        <p className="simulator-empty">No flags match &quot;{search.trim()}&quot;.</p>
      ) : (
        <div className="simulator-flags-list">
          {visibleGroups.map(group => (
            <FlagGroupSection
              key={group.id}
              title={group.name}
              count={(byGroup.get(group.name) ?? []).length}
              onAdd={() => onNewFlag(group.name)}
              onRenameGroup={() => onRenameGroup(group)}
              onRemoveGroup={() => onRemoveGroup(group)}
            >
              {(byGroup.get(group.name) ?? []).map(flag => (
                <FlagRow
                  key={flag.id}
                  flag={flag}
                  usage={usageCounts[flag.id]}
                  groups={groups}
                  onClick={() => onSelectFlag(flag)}
                  onRename={() => onRenameFlag(flag)}
                  onMove={groupName => onMoveFlag(flag, groupName)}
                  onNewGroup={() => onNewGroupForFlag(flag)}
                  onRemove={() => onRemoveFlag(flag)}
                />
              ))}
            </FlagGroupSection>
          ))}
          {showUngrouped && (
            <FlagGroupSection title="Ungrouped" count={ungrouped.length} ungrouped onAdd={() => onNewFlag()}>
              {ungrouped.map(flag => (
                <FlagRow
                  key={flag.id}
                  flag={flag}
                  usage={usageCounts[flag.id]}
                  groups={groups}
                  onClick={() => onSelectFlag(flag)}
                  onRename={() => onRenameFlag(flag)}
                  onMove={groupName => onMoveFlag(flag, groupName)}
                  onNewGroup={() => onNewGroupForFlag(flag)}
                  onRemove={() => onRemoveFlag(flag)}
                />
              ))}
            </FlagGroupSection>
          )}
        </div>
      )}

      <div className="simulator-flags-legend">
        <span className="simulator-flags-legend__dot simulator-flags-legend__dot--on" />
        on now
        <span className="simulator-flags-legend__dot" />
        off
        <span className="simulator-flags-legend__hint">⋯ opens rename · move · remove</span>
      </div>
    </div>
  );
}
