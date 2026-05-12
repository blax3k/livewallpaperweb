import React from 'react';
import { SceneSelectorControl, SceneOption } from './controls/SceneSelectorControl';
import { PhoneGuideControl } from './controls/PhoneGuideControl';

interface TopBarProps {
  scenes: SceneOption[];
  sceneLoaded: boolean;
  isSaving: boolean;
  phoneGuideVisible: boolean;
  zoom: number;
  gyroMode: boolean;
  onSceneSelect: (sceneName: string) => void;
  onPhoneGuideToggle: (visible: boolean) => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onGyroModeToggle: () => void;
}

export function TopBar({ scenes, sceneLoaded, isSaving, phoneGuideVisible, zoom, gyroMode, onSceneSelect, onPhoneGuideToggle, onSave, onZoomIn, onZoomOut, onCenter, onGyroModeToggle }: TopBarProps) {
  return (
    <div className="top-bar">
      <SceneSelectorControl scenes={scenes} onSelect={onSceneSelect} />
      <PhoneGuideControl
        checked={phoneGuideVisible}
        disabled={!sceneLoaded}
        onChange={onPhoneGuideToggle}
      />
      <button onClick={onZoomOut} disabled={!sceneLoaded} title="Zoom out">－</button>
      <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
      <button onClick={onZoomIn} disabled={!sceneLoaded} title="Zoom in">＋</button>
      <button onClick={onCenter} disabled={!sceneLoaded}>Center</button>
      <button
        onClick={onGyroModeToggle}
        disabled={!sceneLoaded}
        title={gyroMode ? 'Switch to default pointer' : 'Switch to gyro simulation mode'}
        className={gyroMode ? 'active' : ''}
      >
        {gyroMode ? '📱 Gyro' : '🖱 Default'}
      </button>
      <button onClick={onSave} disabled={isSaving || !sceneLoaded}>
        {isSaving ? 'Saving...' : 'Save Scene'}
      </button>
    </div>
  );
}
