import React, { useState } from 'react';
import { SceneOption } from './SceneSelectorControl';
import { PhoneGuideControl } from './PhoneGuideControl';
import { ImageLibraryModal } from './modals/ImageLibraryModal';
import { Button } from '../components/Button';

interface TopBarProps {
  projectId: string;
  scenes: SceneOption[];
  currentSceneName: string | null;
  sceneLoaded: boolean;
  isSaving: boolean;
  phoneGuideVisible: boolean;
  zoom: number;
  gyroMode: boolean;
  sceneSizeLabel?: string;
  sceneSizeTitle?: string;
  onBack?: () => void;
  onSceneSelect: (sceneName: string) => void;
  onPhoneGuideToggle: (visible: boolean) => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onGyroModeToggle: () => void;
  onImageReplaced?: (oldResource: string, newResource: string) => void;
}

export function TopBar({projectId, scenes, currentSceneName, sceneLoaded, isSaving, phoneGuideVisible, zoom, gyroMode, sceneSizeLabel, sceneSizeTitle, onBack, onSceneSelect, onPhoneGuideToggle, onSave, onZoomIn, onZoomOut, onCenter, onGyroModeToggle, onImageReplaced }: TopBarProps) {
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
          projectId={projectId}
          onImageReplaced={onImageReplaced}
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
      {sceneSizeLabel && (
        <span className="scene-size-indicator" title={sceneSizeTitle}>
          {sceneSizeLabel}
        </span>
      )}
      <Button onClick={onSave} disabled={isSaving || !sceneLoaded}>
        {isSaving ? 'Saving...' : 'Save Scene'}
      </Button>
    </div>
  );
}
