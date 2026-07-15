import React, { useRef, useEffect, useCallback } from 'react';
import { SceneRenderer } from '../renderers/SceneRenderer';

interface UseSlotDragOptions {
  rendererRef: React.RefObject<SceneRenderer | null>;
  /** Commit the final move as a position-space delta (applied to the option's sprite positions). */
  onCommit: (dx: number, dy: number) => void;
}

/**
 * Drag-to-move the selected slot's framed sprite on the canvas. Mirrors useSpriteDrag but targets
 * the slot preview group: the renderer moves it live (no rebuild) during the drag, and the scene
 * is only mutated once on release via onCommit — matching how base-sprite drags commit on mouseup.
 */
export function useSlotDrag({ rendererRef, onCommit }: UseSlotDragOptions) {
  const dragState = useRef<{ startWorldX: number; startWorldY: number; dx: number; dy: number } | null>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const startSlotDrag = useCallback((cssX: number, cssY: number) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const world = renderer.canvasToWorld(cssX, cssY);
    renderer.beginSlotFrameDrag();
    dragState.current = { startWorldX: world.x, startWorldY: world.y, dx: 0, dy: 0 };
  }, [rendererRef]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const drag = dragState.current;
      const renderer = rendererRef.current;
      if (!drag || !renderer) return;
      const canvas = renderer.getCanvas();
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const world = renderer.canvasToWorld(event.clientX - rect.left, event.clientY - rect.top);
      // y negates: dragging the mouse down should lower the sprite (positionY decreases).
      drag.dx = world.x - drag.startWorldX;
      drag.dy = -(world.y - drag.startWorldY);
      renderer.updateSlotFrameDrag(drag.dx, drag.dy);
    };

    const handleMouseUp = () => {
      const drag = dragState.current;
      const renderer = rendererRef.current;
      if (!drag || !renderer) return;
      dragState.current = null;
      renderer.endSlotFrameDrag();
      if (drag.dx !== 0 || drag.dy !== 0) onCommitRef.current(drag.dx, drag.dy);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [rendererRef]);

  return { startSlotDrag };
}
