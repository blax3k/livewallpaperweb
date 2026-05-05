import React from 'react';

export interface SceneOption {
  value: string;
  label: string;
}

interface SceneSelectorControlProps {
  scenes: SceneOption[];
  onSelect: (sceneName: string) => void;
}

export function SceneSelectorControl({ scenes, onSelect }: SceneSelectorControlProps) {
  return (
    <div className="control-group">
      <label htmlFor="scene-select">Select Scene:</label>
      <select
        id="scene-select"
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
