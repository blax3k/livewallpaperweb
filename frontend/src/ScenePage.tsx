import React, { useRef, useCallback, useState, useEffect } from 'react';
import { SceneEditorPanel, SceneOption } from './controls/panels/SceneEditorPanel';
import { AllConditionsPanel } from './controls/panels/AllConditionsPanel';
import { TopBar } from './controls/TopBar';
import { NotificationStack } from './controls/NotificationStack';
import { EditTextureModal } from './controls/modals/EditTextureModal';
import { useUndoHistory } from './hooks/useUndoHistory';
import { useNotifications } from './hooks/useNotifications';
import { useSceneRenderer } from './hooks/useSceneRenderer';
import { useSpriteDrag } from './hooks/useSpriteDrag';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { computeSceneSize, collectTextureResources, formatBytes } from './utils/sceneSize';
import { scenesApi, flagsApi, imagesApi } from './api';
import type { FlagDefinition, RuleConditionGroup } from '@livewallpaper/types';

interface ScenePageProps {
  initialSceneId?: string;
  projectId: string;
  onBack?: () => void;
  onSaved?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ScenePage({ initialSceneId, projectId, onBack, onSaved, onDirtyChange }: ScenePageProps) {
  const [scenes, setScenes] = useState<SceneOption[]>([]);
  const [availableFlags, setAvailableFlags] = useState<FlagDefinition[]>([]);
  const history = useUndoHistory();
  const { notifications, notify } = useNotifications();
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartSize = useRef<{ width: number; height: number } | null>(null);
  const dragStartDepth = useRef<number | null>(null);
  const dragStartXFocus = useRef<number | null>(null);
  const dragStartYFocus = useRef<number | null>(null);
  const midDragStart = useRef<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const isGyroDragging = useRef(false);
  const gyroOrigin = useRef<{ x: number; y: number } | null>(null);
  const [editTextureIndex, setEditTextureIndex] = useState<number | null>(null);

  const {
    canvasRef,
    rendererRef,
    showSceneControls,
    currentSceneId,
    xFocus,
    yFocus,
    startTime,
    endTime,
    spriteEntries,
    selectedSprite,
    setSelectedSprite,
    isSaving,
    isDirty,
    markDirty,
    phoneGuideVisible,
    loadScene,
    saveScene,
    handleXFocusChange,
    handleYFocusChange,
    handleStartTimeChange,
    handleEndTimeChange,
    handlePhoneGuideToggle,
    handleSpriteToggle,
    handleSpriteSelect,
    handleSpritePositionChange,
    handleSpriteSizeChange,
    handleSpriteDepthChange,
    handleSpriteDepthApply,
    handleAddSprite,
    handleChangeTexture,
    handleDeleteSprite,
    handleRenameSprite,
    handleSelectConditionSet,
    handleAddConditionSet,
    handleRemoveConditionSet,
    handleRenameConditionSet,
    handleSetConditionSetFlags,
    handleZoomIn,
    handleZoomOut,
    handleZoomAtPoint,
    handleCenter,
    zoom,
    conditionsVersion,
    gyroMode,
    handleGyroModeToggle,
    handleGyroOffset,
  } = useSceneRenderer(notify, onSaved);

  const [sceneSize, setSceneSize] = useState<{ label: string; title: string } | null>(null);

  useEffect(() => {
    const sceneData = rendererRef.current?.getSceneData();
    if (!sceneData) { setSceneSize(null); return; }

    const resources = collectTextureResources(sceneData);
    const filenames = [...resources]
      .filter(r => r.startsWith('/uploads/'))
      .map(r => r.slice('/uploads/'.length));

    let cancelled = false;
    imagesApi.getSizesByFilenames(filenames).then(sizeMap => {
      if (cancelled) return;
      const breakdown = computeSceneSize(sceneData, sizeMap);
      setSceneSize({
        label: formatBytes(breakdown.totalBytes),
        title: `Images: ${formatBytes(breakdown.imageBytes)} · JSON: ${formatBytes(breakdown.jsonBytes)}`,
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [spriteEntries, conditionsVersion, rendererRef]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const handleBack = useCallback(() => {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    onBack?.();
  }, [isDirty, onBack]);

  const handleSceneSelect = useCallback((sceneId: string) => {
    if (isDirty && !window.confirm('You have unsaved changes. Switch scenes without saving?')) return;
    loadScene(sceneId);
  }, [isDirty, loadScene]);

  // The AllConditionsPanel lets the user act on any sprite's conditions, not just the one
  // currently selected on canvas — make sure that sprite becomes selected first so the preview
  // (and the Sprite panel's X/Y/Z/W/H fields) end up reflecting the right sprite.
  const ensureSpriteSelected = useCallback((spriteIndex: number) => {
    if (selectedSprite?.index !== spriteIndex) {
      handleSpriteSelect(spriteIndex);
    }
  }, [selectedSprite, handleSpriteSelect]);

  const handleSelectConditionSetForSprite = useCallback((spriteIndex: number, conditionIndex: number) => {
    ensureSpriteSelected(spriteIndex);
    handleSelectConditionSet(spriteIndex, conditionIndex);
  }, [ensureSpriteSelected, handleSelectConditionSet]);

  const handleAddConditionSetForSprite = useCallback((spriteIndex: number) => {
    ensureSpriteSelected(spriteIndex);
    handleAddConditionSet(spriteIndex);
  }, [ensureSpriteSelected, handleAddConditionSet]);

  const handleRemoveConditionSetForSprite = useCallback((spriteIndex: number, conditionIndex: number) => {
    ensureSpriteSelected(spriteIndex);
    handleRemoveConditionSet(spriteIndex, conditionIndex);
  }, [ensureSpriteSelected, handleRemoveConditionSet]);

  const handleRenameConditionSetForSprite = useCallback((spriteIndex: number, conditionIndex: number, name: string) => {
    ensureSpriteSelected(spriteIndex);
    handleRenameConditionSet(spriteIndex, conditionIndex, name);
  }, [ensureSpriteSelected, handleRenameConditionSet]);

  const handleSetConditionSetFlagsForSprite = useCallback((spriteIndex: number, conditionIndex: number, conditions: RuleConditionGroup) => {
    ensureSpriteSelected(spriteIndex);
    handleSetConditionSetFlags(spriteIndex, conditionIndex, conditions);
  }, [ensureSpriteSelected, handleSetConditionSetFlags]);

  const getConditionsForSprite = useCallback((spriteIndex: number) => {
    return rendererRef.current?.getSpriteConditions(spriteIndex) ?? [];
  }, [rendererRef]);

  // A sprite with condition sets always has one selected inside the renderer itself — this just
  // reads that back, per sprite, rather than tracking it as separate React state.
  const getActiveConditionIndexForSprite = useCallback((spriteIndex: number) => {
    return rendererRef.current?.getSelectedConditionIndex(spriteIndex) ?? null;
  }, [rendererRef]);

  const activeConditionSet = selectedSprite !== null
    ? (() => {
        const conditionIndex = getActiveConditionIndexForSprite(selectedSprite.index);
        return conditionIndex !== null && conditionIndex !== -1 ? { spriteIndex: selectedSprite.index, conditionIndex } : null;
      })()
    : null;

  const activeConditionLabel = activeConditionSet
    ? (getConditionsForSprite(activeConditionSet.spriteIndex)[activeConditionSet.conditionIndex]?.name
        ?? `Set ${activeConditionSet.conditionIndex + 1}`)
    : null;

  const applySelectedSpriteMove = useCallback((x: number, y: number) => {
    setSelectedSprite(prev => prev ? { ...prev, x, y } : null);
  }, [setSelectedSprite]);

  const applySelectedSpriteSize = useCallback((width: number, height: number) => {
    setSelectedSprite(prev => prev ? { ...prev, width, height } : null);
  }, [setSelectedSprite]);

  const handleImageReplaced = useCallback(async (oldResource: string, newResource: string) => {
    await rendererRef.current?.replaceTexture(oldResource, newResource);
    markDirty();
  }, [rendererRef, markDirty]);

  const handleTextureApply = useCallback((index: number, textureResource: string, width: number, height: number, texCoordinates: number[]) => {
    rendererRef.current?.changeTexture(index, textureResource, { width, height }, texCoordinates);
    setSelectedSprite(prev => prev?.index === index ? { ...prev, width, height } : prev);
    markDirty();
  }, [rendererRef, setSelectedSprite, markDirty]);

  const { handleCanvasMouseDown, cancelDrag } = useSpriteDrag({
    selectedSprite,
    rendererRef,
    onSpriteMove: applySelectedSpriteMove,
    onDragCommit: (action) => { if (activeConditionSet === null) history.push(action); markDirty(); },
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
    onXFocusApply: handleXFocusChange,
    onYFocusApply: handleYFocusChange,
    onTextureApply: handleTextureApply,
    onMarkDirty: markDirty,
  });

  useEffect(() => {
    scenesApi.list()
      .then((data) =>
        setScenes(data.map(s => ({ value: s.id, label: s.label, thumbnail_url: s.thumbnail_url })))
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) return;
    flagsApi.list(projectId).then(setAvailableFlags).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (initialSceneId) loadScene(initialSceneId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!selectedSprite || !dragStartPos.current || activeConditionSet !== null) return;
    const before = dragStartPos.current;
    dragStartPos.current = null;
    if (before.x !== x || before.y !== y) {
      history.push({ type: 'position', spriteIndex: selectedSprite.index, before, after: { x, y } });
    }
  }, [selectedSprite, history, activeConditionSet]);

  const handleSpriteSizeChangeStart = useCallback(() => {
    if (selectedSprite) dragStartSize.current = { width: selectedSprite.width, height: selectedSprite.height };
  }, [selectedSprite]);

  const handleSpriteSizeCommit = useCallback((width: number, height: number) => {
    if (!selectedSprite || !dragStartSize.current || activeConditionSet !== null) return;
    const before = dragStartSize.current;
    dragStartSize.current = null;
    if (before.width !== width || before.height !== height) {
      history.push({ type: 'scale', spriteIndex: selectedSprite.index, before, after: { width, height } });
    }
  }, [selectedSprite, history, activeConditionSet]);

  const handleChangeTextureWithHistory = useCallback(async (index: number, textureResource: string) => {
    const beforeTexture = rendererRef.current?.getSpriteTextureResource(index) ?? '';
    const beforeSize = rendererRef.current?.getSpriteScale(index);
    const beforeTexCoords = rendererRef.current?.getSpriteTexCoordinates(index) ?? [0, 1, 0, 0, 1, 1, 1, 0];
    await handleChangeTexture(index, textureResource);
    const afterSize = rendererRef.current?.getSpriteScale(index);
    history.push({
      type: 'texture',
      spriteIndex: index,
      before: { textureResource: beforeTexture, width: beforeSize?.width ?? 0, height: beforeSize?.height ?? 0, texCoordinates: beforeTexCoords },
      after: { textureResource, width: afterSize?.width ?? 0, height: afterSize?.height ?? 0, texCoordinates: [0, 1, 0, 0, 1, 1, 1, 0] },
    });
  }, [handleChangeTexture, rendererRef, history]);

  const handleSpriteDepthChangeStart = useCallback((depth: number) => {
    dragStartDepth.current = depth;
  }, []);

  const handleXFocusChangeStart = useCallback((value: number) => {
    dragStartXFocus.current = value;
  }, []);

  const handleXFocusCommit = useCallback((value: number) => {
    if (dragStartXFocus.current === null) return;
    const before = dragStartXFocus.current;
    dragStartXFocus.current = null;
    if (before !== value) {
      history.push({ type: 'xFocus', before, after: value });
    }
  }, [history]);

  const handleYFocusChangeStart = useCallback((value: number) => {
    dragStartYFocus.current = value;
  }, []);

  const handleYFocusCommit = useCallback((value: number) => {
    if (dragStartYFocus.current === null) return;
    const before = dragStartYFocus.current;
    dragStartYFocus.current = null;
    if (before !== value) {
      history.push({ type: 'yFocus', before, after: value });
    }
  }, [history]);

  const handleSpriteDepthCommit = useCallback((depth: number) => {
    if (!selectedSprite || dragStartDepth.current === null || activeConditionSet !== null) return;
    const before = dragStartDepth.current;
    dragStartDepth.current = null;
    if (before !== depth) {
      history.push({ type: 'depth', spriteIndex: selectedSprite.index, before, after: depth });
    }
  }, [selectedSprite, history, activeConditionSet]);

  return (
    <>
      <TopBar
        projectId={projectId}
        scenes={scenes}
        currentSceneName={currentSceneId}
        sceneLoaded={showSceneControls}
        isSaving={isSaving}
        phoneGuideVisible={phoneGuideVisible}
        onBack={handleBack}
        onSceneSelect={handleSceneSelect}
        onPhoneGuideToggle={handlePhoneGuideToggle}
        onSave={saveScene}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenter={handleCenter}
        zoom={zoom}
        gyroMode={gyroMode}
        onGyroModeToggle={handleGyroModeToggle}
        sceneSizeLabel={sceneSize?.label}
        sceneSizeTitle={sceneSize?.title}
        onImageReplaced={handleImageReplaced}
      />
      <div className="app-content">
        <SceneEditorPanel
          sceneLoaded={showSceneControls}
          xFocus={xFocus}
          yFocus={yFocus}
          startTime={startTime}
          endTime={endTime}
          projectId={projectId}
          spriteEntries={spriteEntries}
          selectedSprite={selectedSprite}
          onXFocusChange={handleXFocusChange}
          onXFocusChangeStart={handleXFocusChangeStart}
          onXFocusCommit={handleXFocusCommit}
          onYFocusChange={handleYFocusChange}
          onYFocusChangeStart={handleYFocusChangeStart}
          onYFocusCommit={handleYFocusCommit}
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          onSpriteToggle={handleSpriteToggle}
          onSpriteSelect={handleSpriteSelect}
          onAddSprite={handleAddSprite}
          onChangeTexture={handleChangeTextureWithHistory}
          onDeleteSprite={handleDeleteSprite}
          onRenameSprite={handleRenameSprite}
          onEditTexture={setEditTextureIndex}
          activeConditionLabel={activeConditionLabel}
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
        {showSceneControls && (
          <AllConditionsPanel
            spriteEntries={spriteEntries}
            getConditionsForSprite={getConditionsForSprite}
            availableFlags={availableFlags}
            selectedSpriteIndex={selectedSprite?.index ?? null}
            getActiveConditionIndexForSprite={getActiveConditionIndexForSprite}
            onSelectConditionSet={handleSelectConditionSetForSprite}
            onAddConditionSet={handleAddConditionSetForSprite}
            onRemoveConditionSet={handleRemoveConditionSetForSprite}
            onRenameConditionSet={handleRenameConditionSetForSprite}
            onSetConditionSetFlags={handleSetConditionSetFlagsForSprite}
          />
        )}
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

