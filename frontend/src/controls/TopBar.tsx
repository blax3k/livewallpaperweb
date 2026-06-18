import React, { useState } from 'react';
import { SceneOption } from './SceneSelectorControl';
import { PhoneGuideControl } from './PhoneGuideControl';
import { ImageLibraryModal } from './modals/ImageLibraryModal';
import { Button } from '../components/Button';

interface TopBarProps {
  scenes: SceneOption[];
  currentSceneName: string | null;
  sceneLoaded: boolean;
  isSaving: boolean;
  phoneGuideVisible: boolean;
  zoom: number;
  gyroMode: boolean;
  onBack?: () => void;
  onSceneSelect: (sceneName: string) => void;
  onPhoneGuideToggle: (visible: boolean) => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onGyroModeToggle: () => void;
}

export function TopBar({ scenes, currentSceneName, sceneLoaded, isSaving, phoneGuideVisible, zoom, gyroMode, onBack, onSceneSelect, onPhoneGuideToggle, onSave, onZoomIn, onZoomOut, onCenter, onGyroModeToggle }: TopBarProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);


  return (
    <div className="top-bar">
      {onBack && (
        <Button onClick={onBack} title="Back to scenes">← Scenes</Button>
      )}
      <Button onClick={() => setLibraryOpen(true)} title="Browse and upload images">Image Library</Button>
      {libraryOpen && (
        <ImageLibraryModal
          onClose={() => setLibraryOpen(false)}
        />
      )}
      <PhoneGuideControl
        checked={phoneGuideVisible}
        disabled={!sceneLoaded}
        onChange={onPhoneGuideToggle}
      />
      <Button onClick={onZoomOut} disabled={!sceneLoaded} title="Zoom out">－</Button>
      <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
      <Button onClick={onZoomIn} disabled={!sceneLoaded} title="Zoom in">＋</Button>
      <Button onClick={onCenter} disabled={!sceneLoaded}>Center</Button>
      <Button
        onClick={onGyroModeToggle}
        disabled={!sceneLoaded}
        title={gyroMode ? 'Switch to default pointer' : 'Switch to gyro simulation mode'}
        className={gyroMode ? 'active' : ''}
      >
        {gyroMode ? '📱 Gyro' : '🖱 Default'}
      </Button>
      <Button onClick={onSave} disabled={isSaving || !sceneLoaded}>
        {isSaving ? 'Saving...' : 'Save Scene'}
      </Button>
    </div>
  );
}
