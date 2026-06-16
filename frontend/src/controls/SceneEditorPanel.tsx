import React from 'react';
import { SpriteListPanel, SpriteEntry } from './SpriteListPanel';
import { XFocusControl } from './XFocusControl';
import { SpritePanelControl } from './SpritePanelControl';
import { ConditionSetsPanel } from './ConditionSetsPanel';
import type { SpriteConditionBlock, RuleConditionGroup, FlagDefinition } from '@livewallpaper/types';

export type { SceneOption } from './SceneSelectorControl';

interface SelectedSprite {
  index: number;
  name: string;
  x: number;
  y: number;
  depth: number;
  width: number;
  height: number;
}

interface SceneEditorPanelProps {
  sceneLoaded: boolean;
  xFocus: number;
  startTime: number;
  endTime: number;
  spriteEntries: SpriteEntry[];
  selectedSprite: SelectedSprite | null;
  onXFocusChange: (value: number) => void;
  onXFocusChangeStart?: (value: number) => void;
  onXFocusCommit?: (value: number) => void;
  onStartTimeChange: (value: number) => void;
  onEndTimeChange: (value: number) => void;
  onSpriteToggle: (index: number) => void;
  onSpriteSelect: (index: number) => void;
  onAddSprite: (textureResource: string) => void;
  onChangeTexture: (index: number, textureResource: string) => void;
  onDeleteSprite: (index: number) => void;
  onRenameSprite: (index: number, newName: string) => void;
  onEditTexture: (index: number) => void;
  onEditConditions?: (index: number) => void;
  // Condition sets (inline panel)
  selectedSpriteConditions?: SpriteConditionBlock[];
  availableFlags?: FlagDefinition[];
  activeConditionIndex?: number | null;
  onSelectConditionSet?: (spriteIndex: number, conditionIndex: number | null) => void;
  onAddConditionSet?: (spriteIndex: number) => void;
  onRemoveConditionSet?: (spriteIndex: number, conditionIndex: number) => void;
  onRenameConditionSet?: (spriteIndex: number, conditionIndex: number, name: string) => void;
  onSetConditionSetFlags?: (spriteIndex: number, conditionIndex: number, conditions: RuleConditionGroup) => void;
  onSpritePositionChange: (x: number, y: number) => void;
  onSpritePositionChangeStart?: (x: number, y: number) => void;
  onSpritePositionCommit?: (x: number, y: number) => void;
  onSpriteDepthChange: (depth: number) => void;
  onSpriteDepthChangeStart?: (depth: number) => void;
  onSpriteDepthCommit?: (depth: number) => void;
  onSpriteSizeChange: (width: number, height: number) => void;
  onSpriteSizeChangeStart?: () => void;
  onSpriteSizeCommit?: (width: number, height: number) => void;
}

export function SceneEditorPanel({
  sceneLoaded,
  xFocus,
  startTime,
  endTime,
  spriteEntries,
  selectedSprite,
  onXFocusChange,
  onXFocusChangeStart,
  onXFocusCommit,
  onStartTimeChange,
  onEndTimeChange,
  onSpriteToggle,
  onSpriteSelect,
  onAddSprite,
  onChangeTexture,
  onDeleteSprite,
  onRenameSprite,
  onEditTexture,
  onEditConditions,
  selectedSpriteConditions,
  availableFlags,
  activeConditionIndex,
  onSelectConditionSet,
  onAddConditionSet,
  onRemoveConditionSet,
  onRenameConditionSet,
  onSetConditionSetFlags,
  onSpritePositionChange,
  onSpritePositionChangeStart,
  onSpritePositionCommit,
  onSpriteDepthChange,
  onSpriteDepthChangeStart,
  onSpriteDepthCommit,
  onSpriteSizeChange,
  onSpriteSizeChangeStart,
  onSpriteSizeCommit,
}: SceneEditorPanelProps) {
  function minutesToTimeString(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function timeStringToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  return (
    <div className="controls">
      <h2>Scene</h2>
      <XFocusControl disabled={!sceneLoaded} value={xFocus} onChange={onXFocusChange} onChangeStart={onXFocusChangeStart} onChangeCommit={onXFocusCommit} />
      <div className="control-group">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label htmlFor="start-time-input" style={{ fontSize: '12px', marginBottom: '4px' }}>Start Time:</label>
            <input
              type="time"
              id="start-time-input"
              disabled={!sceneLoaded}
              value={minutesToTimeString(startTime)}
              onChange={(e) => onStartTimeChange(timeStringToMinutes(e.target.value))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label htmlFor="end-time-input" style={{ fontSize: '12px', marginBottom: '4px' }}>End Time:</label>
            <input
              type="time"
              id="end-time-input"
              disabled={!sceneLoaded}
              value={minutesToTimeString(endTime)}
              onChange={(e) => onEndTimeChange(timeStringToMinutes(e.target.value))}
            />
          </div>
        </div>
      </div>
      <h2>Sprites</h2>
      <div className="control-group">
        <SpriteListPanel
          entries={spriteEntries}
          selectedName={selectedSprite?.name ?? null}
          onToggle={onSpriteToggle}
          onSelect={onSpriteSelect}
          onAdd={onAddSprite}
          onChangeTexture={onChangeTexture}
          onDelete={onDeleteSprite}
          onRename={onRenameSprite}
          onEditTexture={onEditTexture}
          onEditConditions={onEditConditions}
        />
      </div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        Sprite
        {activeConditionIndex !== null && activeConditionIndex !== undefined && selectedSprite && (
          <span style={{ fontSize: 10, fontWeight: 400, background: '#143050', color: '#4a9eff', border: '1px solid #224', borderRadius: 3, padding: '1px 5px' }}>
            {selectedSpriteConditions?.[activeConditionIndex]?.name ?? `Set ${activeConditionIndex + 1}`}
          </span>
        )}
      </h2>
      <div className="control-group">
        <SpritePanelControl
          spriteName={selectedSprite?.name ?? ''}
          x={selectedSprite?.x ?? 0}
          y={selectedSprite?.y ?? 0}
          depth={selectedSprite?.depth ?? 1.0}
          width={selectedSprite?.width ?? 0}
          height={selectedSprite?.height ?? 0}
          disabled={selectedSprite === null}
          onChange={onSpritePositionChange}
          onChangeStart={onSpritePositionChangeStart}
          onChangeCommit={onSpritePositionCommit}
          onDepthChange={onSpriteDepthChange}
          onDepthChangeStart={onSpriteDepthChangeStart}
          onDepthCommit={onSpriteDepthCommit}
          onSizeChange={onSpriteSizeChange}
          onSizeChangeStart={onSpriteSizeChangeStart}
          onSizeCommit={onSpriteSizeCommit}
        />
      </div>
      {selectedSprite !== null && onSelectConditionSet && onAddConditionSet && onRemoveConditionSet && onRenameConditionSet && onSetConditionSetFlags && (
        <div className="control-group">
          <ConditionSetsPanel
            spriteIndex={selectedSprite.index}
            conditionBlocks={selectedSpriteConditions ?? []}
            availableFlags={availableFlags ?? []}
            activeConditionIndex={activeConditionIndex ?? null}
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
}


