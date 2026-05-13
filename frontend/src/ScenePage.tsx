import React, { useRef, useCallback, useState, useEffect } from 'react';
import { SceneEditorPanel, SceneOption } from './controls/SceneEditorPanel';
import { TopBar } from './controls/TopBar';
import { NotificationStack } from './controls/NotificationStack';
import { EditTextureModal } from './controls/EditTextureModal';
import { useUndoHistory } from './hooks/useUndoHistory';
import { useNotifications } from './hooks/useNotifications';
import { useSceneRenderer } from './hooks/useSceneRenderer';
import { useSpriteDrag } from './hooks/useSpriteDrag';
import { useKeyboardControls } from './hooks/useKeyboardControls';

interface ScenePageProps {
  scenes: SceneOption[];
}

export function ScenePage({ scenes: initialScenes }: ScenePageProps) {
  const [scenes, setScenes] = useState<SceneOption[]>(initialScenes);
  const history = useUndoHistory();
  const { notifications, notify } = useNotifications();
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartSize = useRef<{ width: number; height: number } | null>(null);
  const dragStartDepth = useRef<number | null>(null);
  const midDragStart = useRef<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const isGyroDragging = useRef(false);
  const gyroOrigin = useRef<{ x: number; y: number } | null>(null);
  const [editTextureIndex, setEditTextureIndex] = useState<number | null>(null);

  const {
    canvasRef,
    rendererRef,
    showSceneControls,
    currentSceneName,
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
    handleAddSprite,
    handleDeleteSprite,
    handleZoomIn,
    handleZoomOut,
    handleZoomAtPoint,
    handleCenter,
    zoom,
    gyroMode,
    handleGyroModeToggle,
    handleGyroOffset,
  } = useSceneRenderer(notify);

  const applySelectedSpriteMove = useCallback((x: number, y: number) => {
    setSelectedSprite(prev => prev ? { ...prev, x, y } : null);
  }, [setSelectedSprite]);

  const applySelectedSpriteSize = useCallback((width: number, height: number) => {
    setSelectedSprite(prev => prev ? { ...prev, width, height } : null);
  }, [setSelectedSprite]);

  const { handleCanvasMouseDown, cancelDrag } = useSpriteDrag({
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

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      handleZoomAtPoint(cssX, cssY, factor);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [canvasRef, rendererRef, handleZoomAtPoint]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      cancelDrag();
      midDragStart.current = { x: e.clientX, y: e.clientY };
      setIsPanning(true);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!midDragStart.current) return;
      const dx = e.clientX - midDragStart.current.x;
      const dy = e.clientY - midDragStart.current.y;
      midDragStart.current = { x: e.clientX, y: e.clientY };
      rendererRef.current?.panBy(dx, dy);
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 1) return;
      midDragStart.current = null;
      setIsPanning(false);
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [canvasRef, rendererRef, cancelDrag]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      if (!gyroMode || e.button !== 0) return;
      e.stopPropagation();
      cancelDrag();
      isGyroDragging.current = true;
      gyroOrigin.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isGyroDragging.current || !gyroOrigin.current) return;
      const canvas = rendererRef.current?.getCanvas();
      const w = canvas ? parseFloat(canvas.style.width) || canvas.width : el.clientWidth;
      const h = canvas ? parseFloat(canvas.style.height) || canvas.height : el.clientHeight;
      const dx = e.clientX - gyroOrigin.current.x;
      const dy = e.clientY - gyroOrigin.current.y;
      handleGyroOffset(dx, dy, w, h);
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isGyroDragging.current = false;
      gyroOrigin.current = null;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [canvasRef, rendererRef, gyroMode, handleGyroOffset, cancelDrag]);

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

  const handleNewScene = useCallback(async (label: string) => {
    const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const emptyScene = { sprites: [], xFocus: 0.5 };
    try {
      const response = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, label, data: emptyScene }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        notify((err as { error?: string }).error ?? 'Failed to create scene');
        return;
      }
      setScenes(prev => [...prev, { value: name, label }].sort((a, b) => a.label.localeCompare(b.label)));
      loadScene(name);
    } catch {
      notify('Failed to create scene');
    }
  }, [loadScene, notify]);

  return (
    <>
      <TopBar
        scenes={scenes}
        currentSceneName={currentSceneName}
        sceneLoaded={showSceneControls}
        isSaving={isSaving}
        phoneGuideVisible={phoneGuideVisible}
        onSceneSelect={loadScene}
        onNewScene={handleNewScene}
        onPhoneGuideToggle={handlePhoneGuideToggle}
        onSave={saveScene}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenter={handleCenter}
        zoom={zoom}
        gyroMode={gyroMode}
        onGyroModeToggle={handleGyroModeToggle}
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
          onAddSprite={handleAddSprite}
          onDeleteSprite={handleDeleteSprite}
          onEditTexture={setEditTextureIndex}
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
          <div
            id="canvas-container"
            ref={canvasRef}
            onMouseDown={gyroMode ? undefined : handleCanvasMouseDown}
            style={
              gyroMode
                ? { cursor: isGyroDragging.current ? 'crosshair' : 'crosshair' }
                : isPanning
                  ? { cursor: 'grabbing' }
                  : zoom > 1
                    ? { cursor: 'grab' }
                    : undefined
            }
          />
        </div>
      </div>
      <NotificationStack notifications={notifications} />
      {editTextureIndex !== null && (() => {
        const texData = rendererRef.current?.getSpriteTexData(editTextureIndex);
        if (!texData) return null;
        return (
          <EditTextureModal
            spriteName={spriteEntries[editTextureIndex]?.name ?? `Sprite ${editTextureIndex}`}
            textureResource={texData.textureResource}
            texCoordinates={texData.texCoordinates}
            width={texData.width}
            height={texData.height}
            onApply={(texCoords, width, height) => {
              rendererRef.current?.applyTexture(editTextureIndex, texCoords, width, height);
              setSelectedSprite(prev =>
                prev && prev.index === editTextureIndex ? { ...prev, width, height } : prev,
              );
              setEditTextureIndex(null);
            }}
            onClose={() => setEditTextureIndex(null)}
          />
        );
      })()}
    </>
  );
}

