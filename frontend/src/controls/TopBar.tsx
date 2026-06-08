import React, { useState } from 'react';
import { SceneSelectorControl, SceneOption } from './SceneSelectorControl';
import { PhoneGuideControl } from './PhoneGuideControl';
import { NewSceneDialog } from './NewSceneDialog';
import { ImageLibraryModal } from './ImageLibraryModal';
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
  onNewScene: (label: string) => void;
  onPhoneGuideToggle: (visible: boolean) => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onGyroModeToggle: () => void;
}

export function TopBar({ scenes, currentSceneName, sceneLoaded, isSaving, phoneGuideVisible, zoom, gyroMode, onBack, onSceneSelect, onNewScene, onPhoneGuideToggle, onSave, onZoomIn, onZoomOut, onCenter, onGyroModeToggle }: TopBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleConfirm = (label: string) => {
    setDialogOpen(false);
    onNewScene(label);
  };

  return (
    <div className="top-bar">
      {onBack && (
        <Button onClick={onBack} title="Back to scenes">← Scenes</Button>
      )}
      <Button onClick={() => setDialogOpen(true)}>+ New Scene</Button>
      {dialogOpen && (
        <NewSceneDialog
          onConfirm={handleConfirm}
          onCancel={() => setDialogOpen(false)}
        />
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
