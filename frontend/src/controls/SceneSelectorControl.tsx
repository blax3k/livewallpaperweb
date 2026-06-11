import React from 'react';

export interface SceneOption {
  value: string;
  label: string;
  thumbnail_url?: string;
}

interface SceneSelectorControlProps {
  scenes: SceneOption[];
  currentScene?: string | null;
  disabled?: boolean;
  onSelect: (sceneName: string) => void;
}

export function SceneSelectorControl({ scenes, currentScene, disabled, onSelect }: SceneSelectorControlProps) {
  return (
    <div className="control-group">
      <label htmlFor="scene-select">Scene:</label>
      <select
        id="scene-select"
        disabled={disabled}
        value={currentScene ?? ''}
        onChange={(e) => {
          if (e.target.value) onSelect(e.target.value);
        }}
      >
        <option value="">-- Choose a scene --</option>
        {scenes.map((scene) => (
          <option key={scene.value} value={scene.value}>
            {scene.label}
          </option>
        ))}
      </select>
    </div>
  );
}
