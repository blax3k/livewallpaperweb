import React, { useRef, useCallback } from 'react';
import { SceneEditorPanel, SceneOption } from './SceneEditorPanel';
import { useUndoHistory } from './hooks/useUndoHistory';
import { useSceneRenderer } from './hooks/useSceneRenderer';
import { useSpriteDrag } from './hooks/useSpriteDrag';
import { useKeyboardControls } from './hooks/useKeyboardControls';

interface ScenePageProps {
  scenes: SceneOption[];
}

export function ScenePage({ scenes }: ScenePageProps) {
  const history = useUndoHistory();
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const {
    canvasRef,
    rendererRef,
    showSceneControls,
    xFocus,
    spriteEntries,
    selectedSprite,
    setSelectedSprite,
    loadScene,
    handleXFocusChange,
    handlePhoneGuideToggle,
    handleSpriteToggle,
    handleSpriteSelect,
    handleSpritePositionChange,
  } = useSceneRenderer();

  const applySelectedSpriteMove = useCallback((x: number, y: number) => {
    setSelectedSprite(prev => prev ? { ...prev, x, y } : null);
  }, [setSelectedSprite]);

  const { handleCanvasMouseDown } = useSpriteDrag({
    selectedSprite,
    rendererRef,
    onSpriteMove: applySelectedSpriteMove,
    onDragCommit: (action) => history.push(action),
  });

  useKeyboardControls({
    selectedSprite,
    rendererRef,
    history,
    onUndoApply: applySelectedSpriteMove,
    onRedoApply: applySelectedSpriteMove,
    onSpriteMove: applySelectedSpriteMove,
  });

  const handleSpritePositionChangeStart = useCallback((x: number, y: number) => {
    dragStartPos.current = { x, y };
  }, []);

  const handleSpritePositionCommit = useCallback((x: number, y: number) => {
    if (!selectedSprite || !dragStartPos.current) return;
    const before = dragStartPos.current;
    dragStartPos.current = null;
    if (before.x !== x || before.y !== y) {
      history.push({ spriteIndex: selectedSprite.index, before, after: { x, y } });
    }
  }, [selectedSprite, history]);

  return (
    <>
      <SceneEditorPanel
        scenes={scenes}
        showSceneControls={showSceneControls}
        xFocus={xFocus}
        spriteEntries={spriteEntries}
        selectedSprite={selectedSprite}
        onSceneSelect={loadScene}
        onXFocusChange={handleXFocusChange}
        onPhoneGuideToggle={handlePhoneGuideToggle}
        onSpriteToggle={handleSpriteToggle}
        onSpriteSelect={handleSpriteSelect}
        onSpritePositionChange={handleSpritePositionChange}
        onSpritePositionChangeStart={handleSpritePositionChangeStart}
        onSpritePositionCommit={handleSpritePositionCommit}
      />
      <div className="main-content">
        <div id="canvas-container" ref={canvasRef} onMouseDown={handleCanvasMouseDown} />
      </div>
    </>
  );
}

