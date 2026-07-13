import { useEffect, useRef } from 'react';
import { SceneRenderer } from './renderers/SceneRenderer';
import type { PhoneGuideAspectRatio } from './renderers/PhoneGuide';
import { matchesConditionGroup, type WorldState } from './ruleEngine';
import { resolveScene } from './sceneResolver';
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
export function useSimulatorPreview(scene: SceneDetail | null, world: WorldState, aspect: AspectRatio, wakeSeed: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const worldRef = useRef(world);
  worldRef.current = world;
  // Which scene id is currently painted, so we can tell a scene *change* (wipe) apart from a
  // same-scene reshuffle (a fresh wakeSeed or a manual roll — reseed in place, no wipe).
  const renderedSceneIdRef = useRef<string | null>(null);

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

  // (Re)load when the pinned scene changes or the wake seed advances, reading the world snapshot at
  // that instant. Slots resolve to a flat sprite list here (see resolveScene): `first-match` slots
  // and base sprites are deterministic, while `weighted-random` slots pick from the seed, so a
  // fresh wakeSeed each wake — or a manual roll — reshuffles them. Sprite condition sets then
  // resolve against the same snapshot, so the scene shows the right variants from the first frame.
  //
  // A genuine scene *change* animates with the same diagonal wipe the Android wallpaper uses (the
  // first load has nothing to wipe from, so it's instant). A same-scene reseed instead reloads in
  // place with no wipe — the point of a roll is to spot-check variety, not replay the transition.
  //
  // Deliberately keyed on `sceneId` + `wakeSeed`, not the whole `scene` object: flag declarations
  // live in `scene.data.flags` and don't affect the rendered pixels, so saving the Scene Flags
  // modal — which swaps in a fresh detail object for the same pinned scene without advancing the
  // seed — must not replay the wipe. See the report about the flags modal "activating" the renderer.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (!scene) {
      renderer.loadScene(EMPTY_SCENE);
      renderedSceneIdRef.current = null;
      return;
    }
    const snapshot = worldRef.current;
    const matcher = (group: Parameters<typeof matchesConditionGroup>[0]) => matchesConditionGroup(group, snapshot);
    const resolvedScene = { ...scene.data, slots: undefined, sprites: resolveScene(scene.data, scene.id, snapshot, wakeSeed) };

    const sceneChanged = renderedSceneIdRef.current !== scene.id;
    renderedSceneIdRef.current = scene.id;
    if (sceneChanged) {
      renderer.transitionToScene(resolvedScene, matcher);
    } else {
      // Same scene, new seed (wake re-picked it, or the user rolled): reshuffle without a wipe.
      renderer.loadScene(resolvedScene).then(() => renderer.applyConditionSelection(matcher));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on scene identity + seed, not the mutable detail object
  }, [sceneId, wakeSeed]);

  return containerRef;
}
