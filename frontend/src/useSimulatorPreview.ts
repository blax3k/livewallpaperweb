import { useEffect, useRef } from 'react';
import { SceneRenderer } from './renderers/SceneRenderer';
import { matchesConditionGroup, type WorldState } from './ruleEngine';
import type { SceneDetail } from './api';

const EMPTY_SCENE = { sprites: [], xFocus: 0.5, yFocus: 0.5 };

/**
 * Mounts a single non-interactive SceneRenderer into the returned container and renders the
 * pinned scene. Sprite condition sets are resolved against the world as it is at the moment the
 * scene changes (i.e. the wake snapshot), so later live flag/time edits don't move the render.
 */
export function useSimulatorPreview(scene: SceneDetail | null, world: WorldState) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const worldRef = useRef(world);
  worldRef.current = world;

  // One renderer for the lifetime of the panel.
  useEffect(() => {
    if (!containerRef.current) return;
    const renderer = new SceneRenderer(containerRef.current);
    rendererRef.current = renderer;
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // (Re)load whenever the pinned scene changes, reading the world snapshot at that instant.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    let cancelled = false;
    (async () => {
      await renderer.loadScene(scene ? scene.data : EMPTY_SCENE);
      if (cancelled || !scene) return;
      const snapshot = worldRef.current;
      renderer.applyConditionSelection(group => matchesConditionGroup(group, snapshot));
    })();
    return () => {
      cancelled = true;
    };
  }, [scene]);

  return containerRef;
}
