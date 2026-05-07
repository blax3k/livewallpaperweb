import React from 'react';
import { SpriteListPanel, SpriteEntry } from './controls/SpriteListPanel';
import { XFocusControl } from './controls/XFocusControl';
import { SpritePanelControl } from './controls/SpritePanelControl';

export type { SceneOption } from './controls/SceneSelectorControl';

interface SelectedSprite {
  index: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SceneEditorPanelProps {
  sceneLoaded: boolean;
  xFocus: number;
  spriteEntries: SpriteEntry[];
  selectedSprite: SelectedSprite | null;
  onXFocusChange: (value: number) => void;
  onSpriteToggle: (index: number) => void;
  onSpriteSelect: (index: number) => void;
  onSpritePositionChange: (x: number, y: number) => void;
  onSpritePositionChangeStart?: (x: number, y: number) => void;
  onSpritePositionCommit?: (x: number, y: number) => void;
  onSpriteSizeChange: (width: number, height: number) => void;
  onSpriteSizeChangeStart?: () => void;
  onSpriteSizeCommit?: (width: number, height: number) => void;
}

export function SceneEditorPanel({
  sceneLoaded,
  xFocus,
  spriteEntries,
  selectedSprite,
  onXFocusChange,
  onSpriteToggle,
  onSpriteSelect,
  onSpritePositionChange,
  onSpritePositionChangeStart,
  onSpritePositionCommit,
  onSpriteSizeChange,
  onSpriteSizeChangeStart,
  onSpriteSizeCommit,
}: SceneEditorPanelProps) {
  return (
    <div className="controls">
      <h2>Scene</h2>
      <XFocusControl disabled={!sceneLoaded} value={xFocus} onChange={onXFocusChange} />
      <h2>Sprites</h2>
      <div className="control-group">
        <SpriteListPanel
          entries={spriteEntries}
          selectedName={selectedSprite?.name ?? null}
          onToggle={onSpriteToggle}
          onSelect={onSpriteSelect}
        />
      </div>
      <h2>Sprite</h2>
      <div className="control-group">
        <SpritePanelControl
          spriteName={selectedSprite?.name ?? ''}
          x={selectedSprite?.x ?? 0}
          y={selectedSprite?.y ?? 0}
          width={selectedSprite?.width ?? 0}
          height={selectedSprite?.height ?? 0}
          disabled={selectedSprite === null}
          onChange={onSpritePositionChange}
          onChangeStart={onSpritePositionChangeStart}
          onChangeCommit={onSpritePositionCommit}
          onSizeChange={onSpriteSizeChange}
          onSizeChangeStart={onSpriteSizeChangeStart}
          onSizeCommit={onSpriteSizeCommit}
        />
      </div>
    </div>
  );
}


