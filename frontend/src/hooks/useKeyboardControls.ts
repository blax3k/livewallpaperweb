import React, { useEffect } from 'react';
import { SceneRenderer } from '../renderers/SceneRenderer';
import type { SelectedSprite } from './useSceneRenderer';
import type { useUndoHistory } from './useUndoHistory';

const ARROW_STEP = 0.05;

interface UseKeyboardControlsOptions {
  selectedSprite: SelectedSprite | null;
  rendererRef: React.RefObject<SceneRenderer | null>;
  history: ReturnType<typeof useUndoHistory>;
  onUndoApply: (x: number, y: number) => void;
  onRedoApply: (x: number, y: number) => void;
  onSpriteMove: (x: number, y: number) => void;
  onScaleApply?: (width: number, height: number) => void;
  onDepthApply?: (depth: number, spriteIndex: number) => void;
  onXFocusApply?: (value: number) => void;
}

export function useKeyboardControls({
  selectedSprite,
  rendererRef,
  history,
  onUndoApply,
  onRedoApply,
  onSpriteMove,
  onScaleApply,
  onDepthApply,
  onXFocusApply,
}: UseKeyboardControlsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const action = history.undo();
        if (action) {
          if (action.type === 'position') {
            rendererRef.current?.setSpritePosition(action.spriteIndex, action.before.x, action.before.y);
            onUndoApply(action.before.x, action.before.y);
          } else if (action.type === 'scale') {
            rendererRef.current?.setSpriteSize(action.spriteIndex, action.before.width, action.before.height);
            onScaleApply?.(action.before.width, action.before.height);
          } else if (action.type === 'depth') {
            onDepthApply?.(action.before, action.spriteIndex);
          } else if (action.type === 'xFocus') {
            rendererRef.current?.setScrollOffset(action.before);
            onXFocusApply?.(action.before);
          }
        }
        return;
      }
      // Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        const action = history.redo();
        if (action) {
          if (action.type === 'position') {
            rendererRef.current?.setSpritePosition(action.spriteIndex, action.after.x, action.after.y);
            onRedoApply(action.after.x, action.after.y);
          } else if (action.type === 'scale') {
            rendererRef.current?.setSpriteSize(action.spriteIndex, action.after.width, action.after.height);
            onScaleApply?.(action.after.width, action.after.height);
          } else if (action.type === 'depth') {
            onDepthApply?.(action.after, action.spriteIndex);
          } else if (action.type === 'xFocus') {
            rendererRef.current?.setScrollOffset(action.after);
            onXFocusApply?.(action.after);
          }
        }
        return;
      }

      // Arrow key nudge
      if (!selectedSprite) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      if (document.activeElement instanceof HTMLInputElement) return;

      e.preventDefault();
      const before = { x: selectedSprite.x, y: selectedSprite.y };
      let { x, y } = selectedSprite;
      if (e.key === 'ArrowLeft')  x -= ARROW_STEP;
      if (e.key === 'ArrowRight') x += ARROW_STEP;
      if (e.key === 'ArrowUp')    y -= ARROW_STEP;
      if (e.key === 'ArrowDown')  y += ARROW_STEP;
      x = Math.round(x / ARROW_STEP) * ARROW_STEP;
      y = Math.round(y / ARROW_STEP) * ARROW_STEP;
      rendererRef.current?.setSpritePosition(selectedSprite.index, x, y);
      history.push({ type: 'position', spriteIndex: selectedSprite.index, before, after: { x, y } });
      onSpriteMove(x, y);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSprite, rendererRef, history, onUndoApply, onRedoApply, onSpriteMove]);
}
