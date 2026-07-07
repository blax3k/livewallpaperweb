import { useMemo } from 'react';
import { CollapsibleGroup } from './components/CollapsibleGroup';
import type { FlagDefinition } from './api';

interface SimulatorFlagsPanelProps {
  flags: FlagDefinition[];
}

export function SimulatorFlagsPanel({ flags }: SimulatorFlagsPanelProps) {
  const flagGroups = useMemo(() => {
    const groups = new Map<string, FlagDefinition[]>();
    for (const flag of flags) {
      const key = flag.group?.trim() || 'Ungrouped';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(flag);
    }
    return Array.from(groups.entries());
  }, [flags]);

  return (
    <div className="simulator-panel simulator-panel--flags">
      <div className="simulator-panel__header">
        <span>Flags · {flags.length}</span>
      </div>
      {flags.length === 0 && <p className="simulator-empty">No flags defined.</p>}
      {flagGroups.map(([groupName, groupFlags]) => (
        <CollapsibleGroup key={groupName} title={groupName} count={groupFlags.length}>
          <div className="simulator-chip-row">
            {groupFlags.map(flag => (
              <span key={flag.id} className={`simulator-chip ${flag.defaultActive ? 'simulator-chip--on' : 'simulator-chip--off'}`}>
                <span className="simulator-chip__dot" />
                <span>{flag.name || flag.id}</span>
              </span>
            ))}
          </div>
        </CollapsibleGroup>
      ))}
      <span className="simulator-new-rule">+ New Flag</span>
    </div>
  );
}
