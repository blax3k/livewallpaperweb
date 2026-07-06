import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, Search, X } from 'lucide-react';
import { ThumbnailChip } from './SpriteListPanel';
import type { SpriteEntry } from './SpriteListPanel';
import type { SpriteConditionBlock } from '@livewallpaper/types';
import { DialogClose } from '../../components/ui/dialog';
import './AllConditionsPanel.scss';

interface AllConditionsPanelProps {
  spriteEntries: SpriteEntry[];
  getConditionsForSprite: (spriteIndex: number) => SpriteConditionBlock[];
  selectedSpriteIndex: number | null;
  getActiveConditionIndexForSprite: (spriteIndex: number) => number | null;
  onSelectConditionSet: (spriteIndex: number, conditionIndex: number) => void;
}

function summarize(block: SpriteConditionBlock) {
  return block.conditions?.checks.length
    ? `${block.conditions.operator} (${block.conditions.checks.length})`
    : 'always';
}

/**
 * "All conditions" modal — every sprite in the scene as a collapsible section, each
 * containing that sprite's condition sets. Read-only summary + navigation: clicking a
 * set selects that sprite and previews it on canvas (handled by the caller, which also
 * closes the modal). Editing conditions happens in the right rail once a sprite is selected.
 */
export function AllConditionsPanel({
  spriteEntries,
  getConditionsForSprite,
  selectedSpriteIndex,
  getActiveConditionIndexForSprite,
  onSelectConditionSet,
}: AllConditionsPanelProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');

  // Auto-expand whichever sprite becomes selected, without collapsing sections opened manually.
  useEffect(() => {
    if (selectedSpriteIndex === null) return;
    setExpanded(prev => (prev.has(selectedSpriteIndex) ? prev : new Set(prev).add(selectedSpriteIndex)));
  }, [selectedSpriteIndex]);

  const toggleExpanded = (index: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const totalSets = useMemo(
    () => spriteEntries.reduce((sum, _, i) => sum + getConditionsForSprite(i).length, 0),
    [spriteEntries, getConditionsForSprite],
  );

  const filteredIndices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return spriteEntries.map((_, i) => i);
    return spriteEntries
      .map((_, i) => i)
      .filter(i => {
        const entry = spriteEntries[i];
        if ((entry.name || '').toLowerCase().includes(q)) return true;
        return getConditionsForSprite(i).some(block => (block.name ?? '').toLowerCase().includes(q));
      });
  }, [spriteEntries, query, getConditionsForSprite]);

  return (
    <div className="all-conditions">
      <div className="all-conditions__header">
        <span className="all-conditions__title">All conditions</span>
        <span className="all-conditions__meta">{spriteEntries.length} sprites · {totalSets} sets</span>
        <div className="all-conditions__search">
          <Search size={12} className="all-conditions__row-icon" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search flags, sprites…"
            className="all-conditions__search-input"
          />
        </div>
        <DialogClose className="all-conditions__close-btn">
          <X size={14} />
        </DialogClose>
      </div>

      <div className="all-conditions__body">
        {spriteEntries.length === 0 && (
          <div className="all-conditions__empty">No sprites in this scene yet.</div>
        )}
        {filteredIndices.map((index) => {
          const entry = spriteEntries[index];
          const isExpanded = expanded.has(index);
          const conditions = getConditionsForSprite(index);
          const activeIndex = getActiveConditionIndexForSprite(index);
          const isPreviewing = activeIndex !== null && activeIndex !== -1;

          if (!isExpanded) {
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggleExpanded(index)}
                className="all-conditions__sprite-row"
              >
                <ChevronRight size={12} className="all-conditions__row-icon" />
                <ThumbnailChip selected={isPreviewing} />
                <span className="all-conditions__sprite-name">{entry.name || `Sprite ${index}`}</span>
                <span className={`all-conditions__set-count-badge ${conditions.length > 0 ? 'all-conditions__set-count-badge--filled' : ''}`.trim()}>
                  {conditions.length > 0 ? `${conditions.length} set${conditions.length === 1 ? '' : 's'}` : 'no sets'}
                </span>
              </button>
            );
          }

          return (
            <div key={index} className="all-conditions__sprite-card">
              <button
                type="button"
                onClick={() => toggleExpanded(index)}
                className="all-conditions__sprite-card-header"
              >
                <ChevronDown size={12} className="all-conditions__row-icon" />
                <ThumbnailChip selected={isPreviewing} />
                <span className="all-conditions__sprite-name all-conditions__sprite-name--active">{entry.name || `Sprite ${index}`}</span>
                <span className={`all-conditions__set-count-badge ${isPreviewing ? 'all-conditions__set-count-badge--accent' : 'all-conditions__set-count-badge--filled'}`.trim()}>
                  {conditions.length} set{conditions.length === 1 ? '' : 's'}
                </span>
              </button>
              <div className="all-conditions__sprite-card-body">
                <div
                  onClick={() => onSelectConditionSet(index, -1)}
                  className={`all-conditions__set-row ${!isPreviewing ? 'all-conditions__set-row--active' : ''}`.trim()}
                >
                  <span className="all-conditions__dot" />
                  <span className="all-conditions__set-name all-conditions__set-name--default">Default</span>
                  <span className="all-conditions__set-summary">no checks</span>
                </div>
                {conditions.map((block, i) => {
                  const isActive = activeIndex === i;
                  return (
                    <div
                      key={i}
                      onClick={() => onSelectConditionSet(index, i)}
                      className={`all-conditions__set-row ${isActive ? 'all-conditions__set-row--active' : ''}`.trim()}
                    >
                      <span className={`all-conditions__dot ${isActive ? 'all-conditions__dot--active' : ''}`.trim()} />
                      <span className={`all-conditions__set-name ${isActive ? 'all-conditions__set-name--active' : ''}`.trim()}>
                        {block.name ?? `Set ${i + 1}`}
                      </span>
                      <span className="all-conditions__set-summary all-conditions__set-summary--muted">{summarize(block)}</span>
                      {isActive && <span className="all-conditions__set-previewing">previewing</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="all-conditions__footer">
        <span className="all-conditions__footer-hint">Click a set to select its sprite and preview it on canvas</span>
        <DialogClose className="all-conditions__done-btn">
          Done
        </DialogClose>
      </div>
    </div>
  );
}
