import { useState, useEffect } from 'react';
import { ChevronDown, Pencil, RefreshCw, MoonStar, Trash2, Plus, Dices } from 'lucide-react';
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

interface SceneCardProps {
  scene: RankedScene;
  onEditFlags: (scene: RankedScene) => void;
  onEditScene: (scene: RankedScene) => void;
  onDelete: (scene: RankedScene) => void;
}

function SceneCard({ scene, onEditFlags, onEditScene, onDelete }: SceneCardProps) {
  const badgeLabel = scene.status === 'wins' ? 'WINS' : scene.status === 'out' ? 'OUT' : `#${scene.rank}`;
  return (
    <div
      className={`simulator-scard simulator-scard--${scene.status}`}
      onClick={() => onEditFlags(scene)}
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
          title="Edit scene"
          onClick={e => { e.stopPropagation(); onEditScene(scene); }}
        >
          <Pencil size={14} strokeWidth={2} />
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
  /** World snapshot used to resolve sprite condition sets on the rendered scene. */
  world: WorldState;
  orderBy: 'least_shown' | 'points';
  onOrderByChange: (value: 'least_shown' | 'points') => void;
  stale: boolean;
  /** Per-wake seed driving weighted-random slot picks (the running wake count). */
  wakeSeed: number;
  onWake: () => void;
  /** Open a scene in the editor (card click and the "Edit scene" link). */
  onEditScene: (sceneId: string) => void;
  onEditFlags: (scene: RankedScene) => void;
  onDeleteScene: (scene: RankedScene) => void;
  /** Create a new scene from the scenes panel. */
  onAddScene: () => void;
}

export function SimulatorPreviewPanel({
  scenes,
  renderedScene,
  world,
  orderBy,
  onOrderByChange,
  stale,
  wakeSeed,
  onWake,
  onEditScene,
  onEditFlags,
  onDeleteScene,
  onAddScene,
}: SimulatorPreviewPanelProps) {
  const [aspect, setAspect] = useState<AspectRatio>('9:16');
  // A roll spot-checks weighted-random variety by advancing the seed without counting as a wake.
  // Reset on each wake so a wake's own seed stays the canonical, reproducible pick.
  const [rollCount, setRollCount] = useState(0);
  useEffect(() => { setRollCount(0); }, [wakeSeed]);
  const qualifyCount = scenes.filter(s => s.status !== 'out').length;
  const renderContainerRef = useSimulatorPreview(renderedScene, world, aspect, wakeSeed + rollCount);

  // Rolling only does something when the pinned scene actually has variable slots.
  const canRoll = (renderedScene?.data.slots?.length ?? 0) > 0;

  const handleEditScene = () => { if (renderedScene) onEditScene(renderedScene.id); };

  return (
    <div className="simulator-panel simulator-panel--preview">
      <div className="simulator-panel__header simulator-panel__header--preview">
        <span>Preview</span>
        <span className="simulator-panel__hint">composited · real sprites</span>
      </div>

      {/* Top section: square render surface beside its controls. */}
      <div className="simulator-preview-top">
        {/* Square render surface — the renderer fills it edge to edge. */}
        <div className="simulator-preview-square">
          <div className="simulator-render-surface" ref={renderContainerRef} />
        </div>

        {/* On-screen render controls, stacked to the right of the phone preview. */}
        <div className="simulator-preview-controls">
          <button className="simulator-wake-button" onClick={onWake}>
            <MoonStar size={14} strokeWidth={2} /> Wake screen
          </button>

          {canRoll && (
            <button className="simulator-roll-button" onClick={() => setRollCount(c => c + 1)} title="Reshuffle this scene's random slots">
              <Dices size={14} strokeWidth={2} /> Roll variant
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="simulator-aspect-chip">
                <span className="simulator-aspect-chip__label">ASPECT</span>
                <span className="simulator-aspect-chip__value">{aspect}</span>
                <ChevronDown className="simulator-aspect-chip__caret" size={11} strokeWidth={2} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {ASPECT_OPTIONS.map(opt => (
                <DropdownMenuItem key={opt.value} onSelect={() => setAspect(opt.value)}>
                  {opt.value === aspect ? '✓ ' : ''}{opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {stale && (
            <div className="simulator-stale-banner">
              <RefreshCw size={12} strokeWidth={2} />
              <span>Stale — re-picked only on wake</span>
            </div>
          )}

          <span className="simulator-edit-scene-link" onClick={handleEditScene}>
            <Pencil size={11} strokeWidth={2} /> Edit scene ▸
          </span>
        </div>
      </div>

      {/* Bottom section: full-width, scrollable grid of qualifying scenes. */}
      <div className="simulator-preview-scenes">
        <div className="simulator-preview-scenes__header">
          <span className="simulator-preview-scenes__title">Scenes</span>
          <button className="simulator-add-scene-button" onClick={onAddScene}>
            <Plus size={13} strokeWidth={2.5} /> Add scene
          </button>
        </div>

        <div className="simulator-preview-scenes__subheader">
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
          <span className="simulator-preview-scenes__count">{qualifyCount} qualify</span>
        </div>

        <div className="simulator-scene-grid">
          {scenes.map(scene => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onEditFlags={onEditFlags}
              onEditScene={s => onEditScene(s.id)}
              onDelete={onDeleteScene}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
