import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SceneSlot } from '@livewallpaper/types';
import { isNoneOption } from '../../slotOps';
import './SlotCyclerPill.scss';

interface SlotCyclerPillProps {
  slot: SceneSlot;
  optionIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Floating control over the canvas for the selected slot: steps the previewed option. Walks ALL
 * options (not just eligible ones) so authors can preview any sprite; the composite dims one that
 * isn't eligible under the current flags.
 */
export function SlotCyclerPill({ slot, optionIndex, onPrev, onNext }: SlotCyclerPillProps) {
  const count = slot.options.length;
  if (count <= 1) return null;
  const option = slot.options[optionIndex];
  const label = option ? (isNoneOption(option) ? 'none' : option.name) : '—';

  return (
    <div className="slot-cycler">
      <button className="slot-cycler__btn" onClick={onPrev} title="Previous sprite">
        <ChevronLeft size={12} />
      </button>
      <div className="slot-cycler__label">
        <span className="slot-cycler__name">{label}</span>
        <span className="slot-cycler__meta">{slot.name} · preview {optionIndex + 1}/{count}</span>
      </div>
      <button className="slot-cycler__btn" onClick={onNext} title="Next sprite">
        <ChevronRight size={12} />
      </button>
    </div>
  );
}
