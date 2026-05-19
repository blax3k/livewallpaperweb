import React, { useState } from 'react';
import { SceneSelectorControl, SceneOption } from './SceneSelectorControl';
import { PhoneGuideControl } from './PhoneGuideControl';
import { NewSceneDialog } from './NewSceneDialog';
import { ImageLibraryModal } from './ImageLibraryModal';

interface TopBarProps {
  scenes: SceneOption[];
  currentSceneName: string | null;
  sceneLoaded: boolean;
  isSaving: boolean;
  phoneGuideVisible: boolean;
  zoom: number;
  gyroMode: boolean;
  onSceneSelect: (sceneName: string) => void;
  onNewScene: (label: string) => void;
  onPhoneGuideToggle: (visible: boolean) => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onGyroModeToggle: () => void;
}

export function TopBar({ scenes, currentSceneName, sceneLoaded, isSaving, phoneGuideVisible, zoom, gyroMode, onSceneSelect, onNewScene, onPhoneGuideToggle, onSave, onZoomIn, onZoomOut, onCenter, onGyroModeToggle }: TopBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleConfirm = (label: string) => {
    setDialogOpen(false);
    onNewScene(label);
  };

  return (
    <div className="top-bar">
      <SceneSelectorControl scenes={scenes} currentScene={currentSceneName} onSelect={onSceneSelect} />
      <button onClick={() => setDialogOpen(true)}>+ New Scene</button>
      {dialogOpen && (
        <NewSceneDialog
          onConfirm={handleConfirm}
          onCancel={() => setDialogOpen(false)}
        />
      )}
      <button onClick={() => setLibraryOpen(true)} title="Browse and upload images">Image Library</button>
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
