import React, { useRef, useEffect, useCallback } from 'react';
import { SceneRenderer } from '../renderers/SceneRenderer';
import type { PositionAction } from './useUndoHistory';
import type { SelectedSprite } from './useSceneRenderer';

interface UseSpriteDragOptions {
  selectedSprite: SelectedSprite | null;
  rendererRef: React.RefObject<SceneRenderer | null>;
  onSpriteMove: (x: number, y: number) => void;
  onDragCommit: (action: PositionAction) => void;
}

export function useSpriteDrag({
  selectedSprite,
  rendererRef,
  onSpriteMove,
  onDragCommit,
}: UseSpriteDragOptions) {
  const canvasDragState = useRef<{
    spriteIndex: number;
    startMouseWorldX: number;
    startMouseWorldY: number;
    startSpriteX: number;
    startSpriteY: number;
  } | null>(null);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (!selectedSprite || !rendererRef.current) return;
    const canvas = rendererRef.current.getCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;
    if (!rendererRef.current.hitTestSprite(selectedSprite.index, cssX, cssY)) return;
    event.preventDefault();
    const world = rendererRef.current.canvasToWorld(cssX, cssY);
    canvasDragState.current = {
      spriteIndex: selectedSprite.index,
      startMouseWorldX: world.x,
      startMouseWorldY: world.y,
      startSpriteX: selectedSprite.x,
      startSpriteY: selectedSprite.y,
    };
  }, [selectedSprite, rendererRef]);

  // Stable drag state ref so the window listeners don't need to re-register when selectedSprite changes
  const dragCallbacksRef = useRef({ onSpriteMove, onDragCommit });
  dragCallbacksRef.current = { onSpriteMove, onDragCommit };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const drag = canvasDragState.current;
      if (!drag || !rendererRef.current) return;
      const canvas = rendererRef.current.getCanvas();
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const world = rendererRef.current.canvasToWorld(event.clientX - rect.left, event.clientY - rect.top);
      const newX = drag.startSpriteX + (world.x - drag.startMouseWorldX);
      const newY = drag.startSpriteY - (world.y - drag.startMouseWorldY);
      rendererRef.current.setSpritePosition(drag.spriteIndex, newX, newY);
      dragCallbacksRef.current.onSpriteMove(newX, newY);
    };

    const handleMouseUp = (event: MouseEvent) => {
      const drag = canvasDragState.current;
      if (!drag || !rendererRef.current) return;
      const canvas = rendererRef.current.getCanvas();
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const world = rendererRef.current.canvasToWorld(event.clientX - rect.left, event.clientY - rect.top);
      const newX = drag.startSpriteX + (world.x - drag.startMouseWorldX);
      const newY = drag.startSpriteY - (world.y - drag.startMouseWorldY);
      canvasDragState.current = null;
      if (newX !== drag.startSpriteX || newY !== drag.startSpriteY) {
        dragCallbacksRef.current.onDragCommit({
          type: 'position',
          spriteIndex: drag.spriteIndex,
          before: { x: drag.startSpriteX, y: drag.startSpriteY },
          after: { x: newX, y: newY },
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [rendererRef]);

  const cancelDrag = useCallback(() => {
    canvasDragState.current = null;
  }, []);

  return { handleCanvasMouseDown, cancelDrag };
}
