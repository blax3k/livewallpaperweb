import { useState } from 'react';
import { ChevronDown, Pencil, RefreshCw, MoonStar, Flag, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './components/ui/dropdown-menu';
import type { RankedScene } from './simulatorScenes';
import type { WorldState } from './ruleEngine';
import type { SceneDetail } from './api';
import { useSimulatorPreview } from './useSimulatorPreview';

export type AspectRatio = '9:16' | '1:1' | '16:9';

const ASPECT_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: '9:16', label: 'Portrait 9:16' },
  { value: '1:1', label: 'Square 1:1' },
  { value: '16:9', label: 'Landscape 16:9' },
];

// Content letterboxed inside the square render surface, sized relative to the
// square so it scales with the panel. The largest dimension fills ~92% of the
// square; the other follows the chosen aspect ratio (short side = 92% × 9/16).
const LETTERBOX_DIMS: Record<AspectRatio, { width: string; height: string }> = {
  '9:16': { width: '51.75%', height: '92%' },
  '1:1': { width: '92%', height: '92%' },
  '16:9': { width: '92%', height: '51.75%' },
};

interface SceneCardProps {
  scene: RankedScene;
  onSelect: (scene: RankedScene) => void;
  onEditFlags: (scene: RankedScene) => void;
  onDelete: (scene: RankedScene) => void;
}

function SceneCard({ scene, onSelect, onEditFlags, onDelete }: SceneCardProps) {
  const badgeLabel = scene.status === 'wins' ? 'WINS' : scene.status === 'out' ? 'OUT' : `#${scene.rank}`;
  return (
    <div
      className={`simulator-scard simulator-scard--${scene.status}`}
      onClick={() => onSelect(scene)}
    >
      <div className="simulator-scard__top">
        <span className="simulator-scard__badge">{badgeLabel}</span>
      </div>
      <span className="simulator-scard__name">{scene.name}</span>
      {scene.reason && <span className="simulator-scard__reason">{scene.reason}</span>}
      {scene.status !== 'out' && (
        <span className="simulator-scard__count">{scene.count}×</span>
      )}
      <div className="simulator-scard__actions">
        <button
          className="simulator-scard__action"
          title="Edit flags"
          onClick={e => { e.stopPropagation(); onEditFlags(scene); }}
        >
          <Flag size={14} strokeWidth={2} />
        </button>
        <button
          className="simulator-scard__action simulator-scard__action--danger"
          title="Delete"
          onClick={e => { e.stopPropagation(); onDelete(scene); }}
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

interface SimulatorPreviewPanelProps {
  /** Ranked scenes for the cards (winner → ranked → out), recomputed live. */
  scenes: RankedScene[];
  /** Scene pinned to the render surface (captured at the last wake), or null if none qualifies. */
  renderedScene: SceneDetail | null;
  /** Display label of the on-screen scene. */
  renderedSceneName: string;
  /** World snapshot used to resolve sprite condition sets on the rendered scene. */
  world: WorldState;
  orderBy: 'least_shown' | 'points';
  onOrderByChange: (value: 'least_shown' | 'points') => void;
  stale: boolean;
  onWake: () => void;
  /** Open a scene in the editor (card click and the "Edit scene" link). */
  onEditScene: (sceneId: string) => void;
  onEditFlags: (scene: RankedScene) => void;
  onDeleteScene: (scene: RankedScene) => void;
}

export function SimulatorPreviewPanel({
  scenes,
  renderedScene,
  renderedSceneName,
  world,
  orderBy,
  onOrderByChange,
  stale,
  onWake,
  onEditScene,
  onEditFlags,
  onDeleteScene,
}: SimulatorPreviewPanelProps) {
  const [aspect, setAspect] = useState<AspectRatio>('9:16');
  const qualifyCount = scenes.filter(s => s.status !== 'out').length;
  const dims = LETTERBOX_DIMS[aspect];
  const renderContainerRef = useSimulatorPreview(renderedScene, world);

  const handleSelectScene = (scene: RankedScene) => onEditScene(scene.id);
  const handleEditScene = () => { if (renderedScene) onEditScene(renderedScene.id); };

  return (
    <div className="simulator-panel simulator-panel--preview">
      <div className="simulator-panel__header simulator-panel__header--preview">
        <span>Preview</span>
        <span className="simulator-panel__hint">composited · real sprites</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="simulator-aspect-chip">
              <span className="simulator-aspect-chip__label">ASPECT</span>
              <span className="simulator-aspect-chip__value">{aspect}</span>
              <ChevronDown className="simulator-aspect-chip__caret" size={11} strokeWidth={2} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ASPECT_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt.value} onSelect={() => setAspect(opt.value)}>
                {opt.value === aspect ? '✓ ' : ''}{opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="simulator-preview-body">
        {/* Fixed square render surface — content letterboxes to the chosen aspect. */}
        <div className="simulator-preview-square">
          <span className="simulator-preview-square__badge">ON SCREEN</span>
          <div
            className="simulator-letterbox"
            style={{ width: dims.width, height: dims.height }}
          >
            <div className="simulator-render-surface" ref={renderContainerRef} />
            <span className="simulator-letterbox__scene-name">{renderedSceneName}</span>
          </div>
          {/* On-wallpaper controls, overlaid at the bottom of the square frame. */}
          <div className="simulator-preview-square__footer">
            {stale && (
              <div className="simulator-stale-banner">
                <RefreshCw size={12} strokeWidth={2} />
                <span>Stale — re-picked only on wake</span>
              </div>
            )}
            <button className="simulator-wake-button" onClick={onWake}>
              <MoonStar size={14} strokeWidth={2} /> Wake screen
            </button>
          </div>
        </div>

        <div className="simulator-preview-right">
          <div className="simulator-preview-toolbar">
            <span className="simulator-preview-toolbar__count">{qualifyCount} qualify</span>
            <div className="simulator-order-toggle">
              <span
                className={`simulator-order-toggle__option ${orderBy === 'least_shown' ? 'simulator-order-toggle__option--active' : ''}`}
                onClick={() => onOrderByChange('least_shown')}
              >
                Least shown
              </span>
              <span
                className={`simulator-order-toggle__option ${orderBy === 'points' ? 'simulator-order-toggle__option--active' : ''}`}
                onClick={() => onOrderByChange('points')}
              >
                Points
              </span>
            </div>
            <span className="simulator-edit-scene-link" onClick={handleEditScene}>
              <Pencil size={11} strokeWidth={2} /> Edit scene ▸
            </span>
          </div>

          <div className="simulator-scene-grid">
            {scenes.map(scene => (
              <SceneCard
                key={scene.id}
                scene={scene}
                onSelect={handleSelectScene}
                onEditFlags={onEditFlags}
                onDelete={onDeleteScene}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
