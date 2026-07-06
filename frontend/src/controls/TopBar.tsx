import React, { useState } from 'react';
import {
  ChevronLeft, ChevronDown, ImageIcon, MousePointer2, Radar, Minus, Plus, Maximize, Save,
} from 'lucide-react';
import { SceneOption } from './SceneSelectorControl';
import { PhoneGuideControl, PhoneGuideValue } from './PhoneGuideControl';
import { ImageLibraryModal } from './modals/ImageLibraryModal';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../components/ui/dropdown-menu';
import './TopBar.scss';

interface TopBarProps {
  projectId: string;
  scenes: SceneOption[];
  currentSceneName: string | null;
  sceneLoaded: boolean;
  isSaving: boolean;
  guideAspectRatio: PhoneGuideValue;
  orientation: 'portrait' | 'landscape';
  zoom: number;
  gyroMode: boolean;
  sceneSizeLabel?: string;
  sceneSizeTitle?: string;
  onBack?: () => void;
  onSceneSelect: (sceneName: string) => void;
  onGuideAspectRatioChange: (value: PhoneGuideValue) => void;
  onOrientationToggle: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenter: () => void;
  onGyroModeToggle: () => void;
  onImageReplaced?: (oldResource: string, newResource: string) => void;
}

function SegmentButton({ active, disabled, onClick, title, children }: { active: boolean; disabled?: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`top-bar__segment-btn ${active ? 'top-bar__segment-btn--active' : ''}`.trim()}
    >
      {children}
    </button>
  );
}

export function TopBar({ projectId, scenes, currentSceneName, sceneLoaded, isSaving, guideAspectRatio, orientation, zoom, gyroMode, sceneSizeLabel, sceneSizeTitle, onBack, onSceneSelect, onGuideAspectRatioChange, onOrientationToggle, onSave, onZoomIn, onZoomOut, onCenter, onGyroModeToggle, onImageReplaced }: TopBarProps) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  const currentScene = scenes.find(s => s.value === currentSceneName);
  const sceneLabel = currentScene?.label ?? (sceneLoaded ? currentSceneName : null) ?? 'Select scene';

  return (
    <div className="top-bar">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          title="Back to scenes"
          className="top-bar__icon-btn"
        >
          <ChevronLeft size={15} />
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={scenes.length === 0}
            className="top-bar__scene-trigger"
          >
            {sceneLabel}
            <ChevronDown size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {scenes.map(scene => (
            <DropdownMenuItem key={scene.value} onSelect={() => onSceneSelect(scene.value)}>
              {scene.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="top-bar__divider" />

      <button
        type="button"
        onClick={() => setLibraryOpen(true)}
        title="Browse and upload images"
        className="top-bar__images-btn"
      >
        <ImageIcon size={13} />
        Images
      </button>
      {libraryOpen && (
        <ImageLibraryModal
          onClose={() => setLibraryOpen(false)}
          projectId={projectId}
          onImageReplaced={onImageReplaced}
        />
      )}

      <PhoneGuideControl
        value={guideAspectRatio}
        disabled={!sceneLoaded}
        onChange={onGuideAspectRatioChange}
      />

      <div className="top-bar__segmented">
        <SegmentButton
          active={orientation === 'portrait'}
          disabled={!sceneLoaded}
          onClick={() => { if (orientation !== 'portrait') onOrientationToggle(); }}
        >
          Portrait
        </SegmentButton>
        <SegmentButton
          active={orientation === 'landscape'}
          disabled={!sceneLoaded}
          onClick={() => { if (orientation !== 'landscape') onOrientationToggle(); }}
        >
          Landscape
        </SegmentButton>
      </div>

      <div className="top-bar__segmented">
        <SegmentButton active={!gyroMode} disabled={!sceneLoaded} title="Pointer" onClick={() => { if (gyroMode) onGyroModeToggle(); }}>
          <MousePointer2 size={13} />
        </SegmentButton>
        <SegmentButton active={gyroMode} disabled={!sceneLoaded} title="Gyro simulation" onClick={() => { if (!gyroMode) onGyroModeToggle(); }}>
          <Radar size={13} />
        </SegmentButton>
      </div>

      <div className="top-bar__spacer">
        <div className="top-bar__segmented">
          <button type="button" onClick={onZoomOut} disabled={!sceneLoaded} title="Zoom out" className="top-bar__zoom-btn">
            <Minus size={13} />
          </button>
          <span className="top-bar__zoom-value">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={onZoomIn} disabled={!sceneLoaded} title="Zoom in" className="top-bar__zoom-btn">
            <Plus size={13} />
          </button>
          <button type="button" onClick={onCenter} disabled={!sceneLoaded} title="Center" className="top-bar__zoom-btn">
            <Maximize size={13} />
          </button>
        </div>

        {sceneSizeLabel && (
          <span className="top-bar__size-label" title={sceneSizeTitle}>
            {sceneSizeLabel}
          </span>
        )}

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !sceneLoaded}
          className="top-bar__save-btn"
        >
          <Save size={13} />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
