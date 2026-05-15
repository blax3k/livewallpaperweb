import React from 'react';
import { SpriteListPanel, SpriteEntry } from './SpriteListPanel';
import { XFocusControl } from './XFocusControl';
import { SpritePanelControl } from './SpritePanelControl';

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
  onStartTimeChange: (value: number) => void;
  onEndTimeChange: (value: number) => void;
  onSpriteToggle: (index: number) => void;
  onSpriteSelect: (index: number) => void;
  onAddSprite: (textureResource: string) => void;
  onDeleteSprite: (index: number) => void;
  onEditTexture: (index: number) => void;
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
  onStartTimeChange,
  onEndTimeChange,
  onSpriteToggle,
  onSpriteSelect,
  onAddSprite,
  onDeleteSprite,
  onEditTexture,
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
      <XFocusControl disabled={!sceneLoaded} value={xFocus} onChange={onXFocusChange} />
      <div className="control-group">
        <label htmlFor="start-time-input">Start Time:</label>
        <input
          type="time"
          id="start-time-input"
          disabled={!sceneLoaded}
          value={minutesToTimeString(startTime)}
          onChange={(e) => onStartTimeChange(timeStringToMinutes(e.target.value))}
        />
      </div>
      <div className="control-group">
        <label htmlFor="end-time-input">End Time:</label>
        <input
          type="time"
          id="end-time-input"
          disabled={!sceneLoaded}
          value={minutesToTimeString(endTime)}
          onChange={(e) => onEndTimeChange(timeStringToMinutes(e.target.value))}
        />
      </div>
      <h2>Sprites</h2>
      <div className="control-group">
        <SpriteListPanel
          entries={spriteEntries}
          selectedName={selectedSprite?.name ?? null}
          onToggle={onSpriteToggle}
          onSelect={onSpriteSelect}
          onAdd={onAddSprite}
          onDelete={onDeleteSprite}
          onEditTexture={onEditTexture}
        />
      </div>
      <h2>Sprite</h2>
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


