import { useEffect, useRef } from 'react';
import { SceneRenderer } from './renderers/SceneRenderer';
import type { PhoneGuideAspectRatio } from './renderers/PhoneGuide';
import { matchesConditionGroup, type WorldState } from './ruleEngine';
import type { SceneDetail } from './api';
import type { AspectRatio } from './SimulatorPreviewPanel';

const EMPTY_SCENE = { sprites: [], xFocus: 0.5, yFocus: 0.5 };

/**
 * Map a simulator aspect option to the renderer's (orientation, guide) pair. The guide
 * rectangle is what the letterbox crops to, and the orientation decides which of xFocus/yFocus
 * pans — so portrait 9:16 pans on xFocus, and square 1:1 (guide fills the world) has no pan
 * slack, leaving xFocus centered exactly as the scene renderer does.
 */
const ASPECT_CONFIG: Record<AspectRatio, { orientation: 'portrait' | 'landscape'; guide: PhoneGuideAspectRatio }> = {
  '9:16': { orientation: 'portrait', guide: '16:9' },
  '1:1': { orientation: 'portrait', guide: '1:1' },
  '16:9': { orientation: 'landscape', guide: '16:9' },
};

/**
 * Mounts a single non-interactive SceneRenderer into the returned container and renders the
 * pinned scene. Sprite condition sets are resolved against the world as it is at the moment the
 * scene changes (i.e. the wake snapshot), so later live flag/time edits don't move the render.
 */
export function useSimulatorPreview(scene: SceneDetail | null, world: WorldState, aspect: AspectRatio) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const worldRef = useRef(world);
  worldRef.current = world;

  // One renderer for the lifetime of the panel.
  useEffect(() => {
    if (!containerRef.current) return;
    const renderer = new SceneRenderer(containerRef.current);
    renderer.setLetterboxEnabled(true);
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Keyed on the pinned scene's *id*, not the SceneDetail object: editing a scene's flags replaces
  // its cached detail object without changing which scene is pinned, and that must not re-run the
  // effects below (see the reload effect). A wake pins a different id; that's the real change.
  const sceneId = scene?.id ?? null;

  // Crop the render to the selected aspect ratio. Orientation drives which focus axis pans, so
  // this also governs how xFocus is applied (see ASPECT_CONFIG). Re-applied on scene reload too,
  // since loadScene resets orientation-dependent positioning.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const { orientation, guide } = ASPECT_CONFIG[aspect];
    renderer.setOrientation(orientation);
    renderer.setGuideAspectRatio(guide);
  }, [aspect, sceneId]);

  // (Re)load only when the pinned scene actually changes, reading the world snapshot at that
  // instant. A scene change animates with the same diagonal wipe the Android wallpaper uses (the
  // first load has nothing to wipe from, so it's instant). Condition sets resolve against the wake
  // snapshot, so the new scene wipes in already showing the right sprite variants.
  //
  // This is deliberately keyed on `sceneId`, not the whole `scene` object: flag declarations live
  // in `scene.data.flags` and don't affect the rendered pixels, so saving the Scene Flags modal —
  // which swaps in a fresh detail object for the same pinned scene — must not replay the wipe. Only
  // a wake (which pins a different id) should. See the report about the flags modal "activating"
  // the renderer.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (!scene) {
      renderer.loadScene(EMPTY_SCENE);
      return;
    }
    const snapshot = worldRef.current;
    renderer.transitionToScene(scene.data, group => matchesConditionGroup(group, snapshot));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on scene identity, not the mutable detail object
  }, [sceneId]);

  return containerRef;
}
