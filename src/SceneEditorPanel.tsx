import React from 'react';
import { SpriteListPanel, SpriteEntry } from './renderers/SpriteListPanel';
import { SceneSelectorControl, SceneOption } from './controls/SceneSelectorControl';
import { XFocusControl } from './controls/XFocusControl';
import { PhoneGuideControl } from './controls/PhoneGuideControl';

export type { SceneOption } from './controls/SceneSelectorControl';

interface SceneEditorPanelProps {
  scenes: SceneOption[];
  showSceneControls: boolean;
  xFocus: number;
  spriteEntries: SpriteEntry[];
  selectedSpriteIndex: number | null;
  onSceneSelect: (sceneName: string) => void;
  onXFocusChange: (value: number) => void;
  onPhoneGuideToggle: (visible: boolean) => void;
  onSpriteToggle: (index: number) => void;
  onSpriteSelect: (index: number) => void;
}

export function SceneEditorPanel({
  scenes,
  showSceneControls,
  xFocus,
  spriteEntries,
  selectedSpriteIndex,
  onSceneSelect,
  onXFocusChange,
  onPhoneGuideToggle,
  onSpriteToggle,
  onSpriteSelect,
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
            selectedIndex={selectedSpriteIndex}
            onToggle={onSpriteToggle}
            onSelect={onSpriteSelect}
          />
        </div>
      )}
    </div>
  );
}

