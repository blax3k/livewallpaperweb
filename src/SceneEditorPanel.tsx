import React from 'react';
import { SpriteListPanel, SpriteEntry } from './controls/SpriteListPanel';
import { SceneSelectorControl, SceneOption } from './controls/SceneSelectorControl';
import { XFocusControl } from './controls/XFocusControl';
import { PhoneGuideControl } from './controls/PhoneGuideControl';
import { SpritePanelControl } from './controls/SpritePanelControl';

export type { SceneOption } from './controls/SceneSelectorControl';

interface SelectedSprite {
  index: number;
  name: string;
  x: number;
  y: number;
}

interface SceneEditorPanelProps {
  scenes: SceneOption[];
  showSceneControls: boolean;
  xFocus: number;
  spriteEntries: SpriteEntry[];
  selectedSprite: SelectedSprite | null;
  onSceneSelect: (sceneName: string) => void;
  onXFocusChange: (value: number) => void;
  onPhoneGuideToggle: (visible: boolean) => void;
  onSpriteToggle: (index: number) => void;
  onSpriteSelect: (index: number) => void;
  onSpritePositionChange: (x: number, y: number) => void;
}

export function SceneEditorPanel({
  scenes,
  showSceneControls,
  xFocus,
  spriteEntries,
  selectedSprite,
  onSceneSelect,
  onXFocusChange,
  onPhoneGuideToggle,
  onSpriteToggle,
  onSpriteSelect,
  onSpritePositionChange,
}: SceneEditorPanelProps) {
  return (
    <div className="controls">
      <h2>Scene Viewer</h2>
      <SceneSelectorControl scenes={scenes} onSelect={onSceneSelect} />
      <XFocusControl visible={showSceneControls} value={xFocus} onChange={onXFocusChange} />
      <PhoneGuideControl visible={showSceneControls} onToggle={onPhoneGuideToggle} />
      <div className="info-text">
        Select a scene to view. Adjust the camera focus slider to parallax scroll.
      </div>
      {showSceneControls && spriteEntries.length > 0 && (
        <div className="control-group">
          <SpriteListPanel
            entries={spriteEntries}
            selectedName={selectedSprite?.name ?? null}
            onToggle={onSpriteToggle}
            onSelect={onSpriteSelect}
          />
        </div>
      )}
      {showSceneControls && (
        <>
          <h2>Sprite</h2>
          <div className="control-group">
            <SpritePanelControl
              spriteName={selectedSprite?.name ?? ''}
              x={selectedSprite?.x ?? 0}
              y={selectedSprite?.y ?? 0}
              disabled={selectedSprite === null}
              onChange={onSpritePositionChange}
            />
          </div>
        </>
      )}
    </div>
  );
}

