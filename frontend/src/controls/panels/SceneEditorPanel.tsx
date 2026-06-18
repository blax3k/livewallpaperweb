import React from 'react';
import { SpriteListPanel, SpriteEntry } from './SpriteListPanel';
import { XFocusControl } from '../XFocusControl';
import { SpritePanelControl } from './SpritePanelControl';

export type { SceneOption } from '../SceneSelectorControl';

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
  projectId: string;
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
  // Name of the condition set currently being previewed for this sprite, if any.
  // Condition sets themselves live in the AllConditionsPanel on the right.
  activeConditionLabel?: string | null;
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
  projectId,
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
  activeConditionLabel,
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

  return (
    <div className="controls">
      <h2>Scene</h2>
      <XFocusControl disabled={!sceneLoaded} value={xFocus} onChange={onXFocusChange} onChangeStart={onXFocusChangeStart} onChangeCommit={onXFocusCommit} />
      <h2>Sprites</h2>
      <div className="control-group">
        <SpriteListPanel
          entries={spriteEntries}
          projectId={projectId}
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
        {activeConditionLabel && selectedSprite && (
          <span style={{ fontSize: 10, fontWeight: 400, background: '#143050', color: '#4a9eff', border: '1px solid #224', borderRadius: 3, padding: '1px 5px' }}>
            {activeConditionLabel}
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
    </div>
  );
}


