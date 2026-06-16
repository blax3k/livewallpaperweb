import React, { useEffect, useState } from 'react';
import { ConditionSetsPanel } from './ConditionSetsPanel';
import type { SpriteEntry } from './SpriteListPanel';
import type { SpriteConditionBlock, RuleConditionGroup, FlagDefinition } from '@livewallpaper/types';
import './AllConditionsPanel.scss';

interface AllConditionsPanelProps {
  spriteEntries: SpriteEntry[];
  getConditionsForSprite: (spriteIndex: number) => SpriteConditionBlock[];
  availableFlags: FlagDefinition[];
  selectedSpriteIndex: number | null;
  getActiveConditionIndexForSprite: (spriteIndex: number) => number | null;
  onSelectConditionSet: (spriteIndex: number, conditionIndex: number) => void;
  onAddConditionSet: (spriteIndex: number) => void;
  onRemoveConditionSet: (spriteIndex: number, conditionIndex: number) => void;
  onRenameConditionSet: (spriteIndex: number, conditionIndex: number, name: string) => void;
  onSetConditionSetFlags: (spriteIndex: number, conditionIndex: number, conditions: RuleConditionGroup) => void;
}

/**
 * Right-hand sidebar listing every sprite in the scene as a collapsible section, each
 * containing that sprite's condition sets. Lets the user inspect/edit any sprite's
 * conditions without first selecting it in the sprite list.
 */
export function AllConditionsPanel({
  spriteEntries,
  getConditionsForSprite,
  availableFlags,
  selectedSpriteIndex,
  getActiveConditionIndexForSprite,
  onSelectConditionSet,
  onAddConditionSet,
  onRemoveConditionSet,
  onRenameConditionSet,
  onSetConditionSetFlags,
}: AllConditionsPanelProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

  return (
    <div className="all-conditions-panel">
      <h2>Conditions</h2>
      {spriteEntries.length === 0 && (
        <div className="acp-empty">No sprites in this scene yet.</div>
      )}
      {spriteEntries.map((entry, index) => {
        const isExpanded = expanded.has(index);
        const conditions = getConditionsForSprite(index);
        const isSelectedSprite = selectedSpriteIndex === index;
        return (
          <div key={index} className={`acp-section${isSelectedSprite ? ' acp-section--selected' : ''}`}>
            <button type="button" className="acp-section-header" onClick={() => toggleExpanded(index)}>
              <span className={`acp-chevron${isExpanded ? ' acp-chevron--open' : ''}`}>▶</span>
              <span className="acp-sprite-name">{entry.name || `Sprite ${index}`}</span>
              <span className="acp-set-count">{conditions.length}</span>
            </button>
            {isExpanded && (
              <div className="acp-section-body">
                <ConditionSetsPanel
                  spriteIndex={index}
                  conditionBlocks={conditions}
                  availableFlags={availableFlags}
                  activeConditionIndex={getActiveConditionIndexForSprite(index)}
                  onSelectCondition={onSelectConditionSet}
                  onAdd={onAddConditionSet}
                  onRemove={onRemoveConditionSet}
                  onRename={onRenameConditionSet}
                  onSetFlags={onSetConditionSetFlags}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
