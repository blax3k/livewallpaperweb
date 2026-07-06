import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { ConditionSetsPanel } from './ConditionSetsPanel';
import { SectionHeading } from './SectionHeading';
import { ThumbnailChip } from './SpriteListPanel';
import type { SpriteConditionBlock, RuleConditionGroup, FlagDefinition } from '@livewallpaper/types';
import './SpriteConditionsPanel.scss';

interface SelectedSprite {
  index: number;
  name: string;
}

interface SpriteConditionsPanelProps {
  selectedSprite: SelectedSprite | null;
  conditionBlocks: SpriteConditionBlock[];
  availableFlags: FlagDefinition[];
  activeConditionIndex: number | null;
  onSelectCondition: (spriteIndex: number, conditionIndex: number) => void;
  onAdd: (spriteIndex: number) => void;
  onRemove: (spriteIndex: number, conditionIndex: number) => void;
  onRename: (spriteIndex: number, conditionIndex: number, name: string) => void;
  onSetFlags: (spriteIndex: number, conditionIndex: number, conditions: RuleConditionGroup) => void;
  onOpenAllConditions: () => void;
}

export function SpriteConditionsPanel({
  selectedSprite,
  conditionBlocks,
  availableFlags,
  activeConditionIndex,
  onSelectCondition,
  onAdd,
  onRemove,
  onRename,
  onSetFlags,
  onOpenAllConditions,
}: SpriteConditionsPanelProps) {
  return (
    <div className="sprite-conditions-panel">
      <div className="sprite-conditions-panel__header">
        <SectionHeading
          className="section-heading--tight"
          action={(
            <button
              type="button"
              onClick={onOpenAllConditions}
              title="View conditions across all sprites"
              className="sprite-conditions-panel__all-sprites-btn"
            >
              <LayoutGrid size={11} />
              All sprites
            </button>
          )}
        >
          Conditions
        </SectionHeading>
        {selectedSprite && (
          <div className="sprite-conditions-panel__identity">
            <ThumbnailChip selected className="thumbnail-chip--sm" />
            <span className="sprite-conditions-panel__identity-name">{selectedSprite.name}</span>
            <span className="sprite-conditions-panel__identity-count">{conditionBlocks.length} set{conditionBlocks.length === 1 ? '' : 's'}</span>
          </div>
        )}
      </div>

      <div className="sprite-conditions-panel__body">
        {selectedSprite === null ? (
          <div className="sprite-conditions-panel__empty">Select a sprite to edit its conditions.</div>
        ) : (
          <ConditionSetsPanel
            spriteIndex={selectedSprite.index}
            conditionBlocks={conditionBlocks}
            availableFlags={availableFlags}
            activeConditionIndex={activeConditionIndex}
            onSelectCondition={onSelectCondition}
            onAdd={onAdd}
            onRemove={onRemove}
            onRename={onRename}
            onSetFlags={onSetFlags}
          />
        )}
      </div>
    </div>
  );
}
