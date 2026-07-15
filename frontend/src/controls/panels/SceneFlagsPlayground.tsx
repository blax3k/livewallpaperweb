import React from 'react';
import { Check, Flag } from 'lucide-react';
import type { FlagDefinition, SceneSlot, SlotOption } from '@livewallpaper/types';
import { isNoneOption } from '../../slotOps';
import './SceneFlagsPlayground.scss';

interface SceneFlagsPlaygroundProps {
  availableFlags: FlagDefinition[];
  previewFlags: ReadonlySet<string>;
  onToggleFlag: (flagId: string) => void;
  /** The slot whose eligibility the readout describes (null = none selected). */
  selectedSlot: SceneSlot | null;
  isOptionEligible: (option: SlotOption) => boolean;
}

export function SceneFlagsPlayground({
  availableFlags,
  previewFlags,
  onToggleFlag,
  selectedSlot,
  isOptionEligible,
}: SceneFlagsPlaygroundProps) {
  return (
    <div className="scene-flags-playground">
      <div className="scene-flags-playground__head">
        <Flag size={12} className="scene-flags-playground__glyph" />
        <span className="scene-flags-playground__label">Scene flags</span>
        <span className="scene-flags-playground__note">preview state</span>
      </div>
      <div className="scene-flags-playground__desc">
        Toggle world-state to see which sprites become eligible. Preview only — doesn't change the scene.
      </div>

      {availableFlags.length === 0 ? (
        <div className="scene-flags-playground__empty">This project has no flags yet.</div>
      ) : (
        <div className="scene-flags-playground__rows">
          {availableFlags.map((flag) => {
            const on = previewFlags.has(flag.id);
            return (
              <button
                key={flag.id}
                type="button"
                className={`flag-toggle ${on ? 'flag-toggle--on' : ''}`.trim()}
                onClick={() => onToggleFlag(flag.id)}
                role="switch"
                aria-checked={on}
              >
                <span className="flag-toggle__name">{flag.name}</span>
                {on && <span className="flag-toggle__on-label">on</span>}
                <span className="flag-toggle__switch">
                  <span className="flag-toggle__knob" />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <EligibilityReadout slot={selectedSlot} isOptionEligible={isOptionEligible} />
    </div>
  );
}

function EligibilityReadout({ slot, isOptionEligible }: { slot: SceneSlot | null; isOptionEligible: (o: SlotOption) => boolean }) {
  if (!slot) {
    return (
      <div className="scene-flags-playground__readout scene-flags-playground__readout--muted">
        Select a slot to see which of its sprites are eligible under the current flags.
      </div>
    );
  }

  const eligible = slot.options.filter(isOptionEligible);
  const names = eligible.map(o => (isNoneOption(o) ? 'none' : o.name)).join(' · ');

  return (
    <div className="scene-flags-playground__readout">
      <div className="scene-flags-playground__readout-head">
        <Check size={11} /> Under current flags
      </div>
      <div className="scene-flags-playground__readout-body">
        <b>{slot.name}</b> slot → <b>{eligible.length} of {slot.options.length}</b> eligible
        {names && <> ({names})</>}.
      </div>
    </div>
  );
}
