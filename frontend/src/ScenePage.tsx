import React, { useRef, useCallback } from 'react';
import { SceneEditorPanel, SceneOption } from './SceneEditorPanel';
import { TopBar } from './TopBar';
import { NotificationStack } from './NotificationStack';
import { useUndoHistory } from './hooks/useUndoHistory';
import { useNotifications } from './hooks/useNotifications';
import { useSceneRenderer } from './hooks/useSceneRenderer';
import { useSpriteDrag } from './hooks/useSpriteDrag';
import { useKeyboardControls } from './hooks/useKeyboardControls';

interface ScenePageProps {
  scenes: SceneOption[];
}

export function ScenePage({ scenes }: ScenePageProps) {
  const history = useUndoHistory();
  const { notifications, notify } = useNotifications();
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartSize = useRef<{ width: number; height: number } | null>(null);
  const dragStartDepth = useRef<number | null>(null);

  const {
    canvasRef,
    rendererRef,
    showSceneControls,
    xFocus,
    spriteEntries,
    selectedSprite,
    setSelectedSprite,
    isSaving,
    phoneGuideVisible,
    loadScene,
    saveScene,
    handleXFocusChange,
    handlePhoneGuideToggle,
    handleSpriteToggle,
    handleSpriteSelect,
    handleSpritePositionChange,
    handleSpriteSizeChange,
    handleSpriteDepthChange,
    handleSpriteDepthApply,
  } = useSceneRenderer(notify);

  const applySelectedSpriteMove = useCallback((x: number, y: number) => {
    setSelectedSprite(prev => prev ? { ...prev, x, y } : null);
  }, [setSelectedSprite]);

  const applySelectedSpriteSize = useCallback((width: number, height: number) => {
    setSelectedSprite(prev => prev ? { ...prev, width, height } : null);
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
    onScaleApply: applySelectedSpriteSize,
    onDepthApply: handleSpriteDepthApply,
  });

  const handleSpritePositionChangeStart = useCallback((x: number, y: number) => {
    dragStartPos.current = { x, y };
  }, []);

  const handleSpritePositionCommit = useCallback((x: number, y: number) => {
    if (!selectedSprite || !dragStartPos.current) return;
    const before = dragStartPos.current;
    dragStartPos.current = null;
    if (before.x !== x || before.y !== y) {
      history.push({ type: 'position', spriteIndex: selectedSprite.index, before, after: { x, y } });
    }
  }, [selectedSprite, history]);

  const handleSpriteSizeChangeStart = useCallback(() => {
    if (selectedSprite) dragStartSize.current = { width: selectedSprite.width, height: selectedSprite.height };
  }, [selectedSprite]);

  const handleSpriteSizeCommit = useCallback((width: number, height: number) => {
    if (!selectedSprite || !dragStartSize.current) return;
    const before = dragStartSize.current;
    dragStartSize.current = null;
    if (before.width !== width || before.height !== height) {
      history.push({ type: 'scale', spriteIndex: selectedSprite.index, before, after: { width, height } });
    }
  }, [selectedSprite, history]);

  const handleSpriteDepthChangeStart = useCallback((depth: number) => {
    dragStartDepth.current = depth;
  }, []);

  const handleSpriteDepthCommit = useCallback((depth: number) => {
    if (!selectedSprite || dragStartDepth.current === null) return;
    const before = dragStartDepth.current;
    dragStartDepth.current = null;
    if (before !== depth) {
      history.push({ type: 'depth', spriteIndex: selectedSprite.index, before, after: depth });
    }
  }, [selectedSprite, history]);

  return (
    <>
      <TopBar
        scenes={scenes}
        sceneLoaded={showSceneControls}
        isSaving={isSaving}
        phoneGuideVisible={phoneGuideVisible}
        onSceneSelect={loadScene}
        onPhoneGuideToggle={handlePhoneGuideToggle}
        onSave={saveScene}
      />
      <div className="app-content">
        <SceneEditorPanel
          sceneLoaded={showSceneControls}
          xFocus={xFocus}
          spriteEntries={spriteEntries}
          selectedSprite={selectedSprite}
          onXFocusChange={handleXFocusChange}
          onSpriteToggle={handleSpriteToggle}
          onSpriteSelect={handleSpriteSelect}
          onSpritePositionChange={handleSpritePositionChange}
          onSpritePositionChangeStart={handleSpritePositionChangeStart}
          onSpritePositionCommit={handleSpritePositionCommit}
          onSpriteDepthChange={handleSpriteDepthChange}
          onSpriteDepthChangeStart={handleSpriteDepthChangeStart}
          onSpriteDepthCommit={handleSpriteDepthCommit}
          onSpriteSizeChange={handleSpriteSizeChange}
          onSpriteSizeChangeStart={handleSpriteSizeChangeStart}
          onSpriteSizeCommit={handleSpriteSizeCommit}
        />
        <div className="main-content">
          <div id="canvas-container" ref={canvasRef} onMouseDown={handleCanvasMouseDown} />
        </div>
      </div>
      <NotificationStack notifications={notifications} />
    </>
  );
}

