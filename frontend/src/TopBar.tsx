import React from 'react';
import { SceneSelectorControl, SceneOption } from './controls/SceneSelectorControl';
import { PhoneGuideControl } from './controls/PhoneGuideControl';

interface TopBarProps {
  scenes: SceneOption[];
  sceneLoaded: boolean;
  isSaving: boolean;
  phoneGuideVisible: boolean;
  onSceneSelect: (sceneName: string) => void;
  onPhoneGuideToggle: (visible: boolean) => void;
  onSave: () => void;
}

export function TopBar({ scenes, sceneLoaded, isSaving, phoneGuideVisible, onSceneSelect, onPhoneGuideToggle, onSave }: TopBarProps) {
  return (
    <div className="top-bar">
      <SceneSelectorControl scenes={scenes} onSelect={onSceneSelect} />
      <PhoneGuideControl
        checked={phoneGuideVisible}
        disabled={!sceneLoaded}
        onChange={onPhoneGuideToggle}
      />
      <button onClick={onSave} disabled={isSaving || !sceneLoaded}>
        {isSaving ? 'Saving...' : 'Save Scene'}
      </button>
    </div>
  );
}
