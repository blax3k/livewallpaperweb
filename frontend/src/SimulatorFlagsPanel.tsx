import { useMemo, useState } from 'react';
import type { FlagDefinition, FlagGroup } from './api';

type UsageCounts = Record<string, { rules: number; scenes: number }>;

interface SimulatorFlagsPanelProps {
  flags: FlagDefinition[];
  groups: FlagGroup[];
  usageCounts: UsageCounts;
  onNewFlag: () => void;
  onSelectFlag: (flag: FlagDefinition) => void;
}

function usageLabel(usage: { rules: number; scenes: number } | undefined): string | null {
  if (!usage) return null;
  const parts: string[] = [];
  if (usage.rules > 0) parts.push(`${usage.rules} rule${usage.rules === 1 ? '' : 's'}`);
  if (usage.scenes > 0) parts.push(`${usage.scenes} scene${usage.scenes === 1 ? '' : 's'}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function FlagRow({ flag, usage, onClick }: { flag: FlagDefinition; usage: { rules: number; scenes: number } | undefined; onClick: () => void }) {
  const label = usageLabel(usage);
  return (
    <div className="simulator-flags-row" onClick={onClick}>
      <span className={`simulator-flags-row__dot ${flag.defaultActive ? 'simulator-flags-row__dot--on' : ''}`} />
      <span className="simulator-flags-row__name">{flag.name || flag.id}</span>
      <span className="simulator-flags-row__used">
        {label ?? <span className="simulator-flags-row__unused">Unused</span>}
      </span>
    </div>
  );
}

interface FlagGroupSectionProps {
  title: string;
  count: number;
  ungrouped?: boolean;
  onAdd?: () => void;
  children: React.ReactNode;
}

function FlagGroupSection({ title, count, ungrouped, onAdd, children }: FlagGroupSectionProps) {
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
        {ungrouped && <span className="simulator-flags-group__hint">— flags with no group · can&apos;t be renamed or removed</span>}
        {onAdd && (
          <button
            className="simulator-flags-group__add"
            onClick={e => { e.stopPropagation(); onAdd(); }}
          >
            +
          </button>
        )}
      </div>
      {open && <div className="simulator-flags-group__rows">{children}</div>}
    </div>
  );
}

export function SimulatorFlagsPanel({ flags, groups, usageCounts, onNewFlag, onSelectFlag }: SimulatorFlagsPanelProps) {
  const [search, setSearch] = useState('');

  const filteredFlags = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flags;
    return flags.filter(f => (f.name || f.id).toLowerCase().includes(q));
  }, [flags, search]);

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

  return (
    <div className="simulator-panel simulator-panel--flags">
      <div className="simulator-flags-header">
        <span className="simulator-flags-header__title">
          <span className="simulator-flags-header__dot" />
          Flags
        </span>
        <span className="simulator-flags-header__count">{flags.length} flags · {groups.length + 1} groups</span>
        <div className="simulator-flags-header__actions">
          <input
            className="simulator-flags-header__search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search flags"
          />
          <button className="simulator-flags-header__new-btn" onClick={onNewFlag}>+ New flag</button>
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
      ) : (
        <div className="simulator-flags-list">
          {groups.map(group => (
            <FlagGroupSection key={group.id} title={group.name} count={(byGroup.get(group.name) ?? []).length}>
              {(byGroup.get(group.name) ?? []).map(flag => (
                <FlagRow key={flag.id} flag={flag} usage={usageCounts[flag.id]} onClick={() => onSelectFlag(flag)} />
              ))}
            </FlagGroupSection>
          ))}
          <FlagGroupSection title="Ungrouped" count={ungrouped.length} ungrouped onAdd={onNewFlag}>
            {ungrouped.map(flag => (
              <FlagRow key={flag.id} flag={flag} usage={usageCounts[flag.id]} onClick={() => onSelectFlag(flag)} />
            ))}
          </FlagGroupSection>
        </div>
      )}

      <div className="simulator-flags-legend">
        <span className="simulator-flags-legend__dot simulator-flags-legend__dot--on" />
        on now
        <span className="simulator-flags-legend__dot" />
        off
      </div>
    </div>
  );
}
