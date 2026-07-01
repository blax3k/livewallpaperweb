import { useState, useRef, useCallback } from 'react';
import { SceneRenderer } from '../renderers/SceneRenderer';
import { scenesApi, spritesApi } from '../api';
import type { SpriteEntry } from '../controls/panels/SpriteListPanel';
import type { Scene } from '../interfaces/Scene';
import type { SpriteConditionBlock, RuleConditionGroup } from '@livewallpaper/types';

export interface SelectedSprite {
  index: number;
  name: string;
  x: number;
  y: number;
  depth: number;
  width: number;
  height: number;
}

export function useSceneRenderer(onNotify?: (message: string) => void, onSaved?: () => void) {
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [xFocus, setXFocus] = useState(0.5);
  const [yFocus, setYFocus] = useState(0.5);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(1439);
  const [spriteEntries, setSpriteEntries] = useState<SpriteEntry[]>([]);
  const [selectedSprite, setSelectedSprite] = useState<SelectedSprite | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const [phoneGuideVisible, setPhoneGuideVisible] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  // Bumped on any condition-set mutation/selection (add/remove/rename/set-flags/select) so
  // components that read condition data straight from the renderer (e.g. AllConditionsPanel,
  // which shows every sprite's conditions at once) know to re-render even when no other state
  // changed. There's no separate "active condition" state here — a sprite with one or more
  // condition sets always has exactly one selected, tracked entirely inside the renderer, and
  // queried fresh via renderer.getSelectedConditionIndex(spriteIndex) wherever it's needed.
  const [conditionsVersion, setConditionsVersion] = useState(0);
  const bumpConditionsVersion = useCallback(() => setConditionsVersion(v => v + 1), []);

  // Declared early (before loadScene/handleSpriteSelect) since they depend on it.
  const handleSelectConditionSet = useCallback((spriteIndex: number, conditionIndex: number) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    if (conditionIndex === -1) {
      renderer.selectDefaultCondition(spriteIndex);
    } else {
      renderer.selectCondition(spriteIndex, conditionIndex);
    }
    bumpConditionsVersion();
    // If this is the sprite currently focused for editing, reflect its new override values.
    const pos = renderer.getSpritePosition(spriteIndex);
    const scale = renderer.getSpriteScale(spriteIndex);
    const parallax = renderer.getSpriteParallax(spriteIndex);
    if (pos && scale && parallax !== null) {
      setSelectedSprite(prev => (prev && prev.index === spriteIndex)
        ? { ...prev, x: pos.x, y: pos.y, width: scale.width, height: scale.height, depth: parallax }
        : prev);
    }
  }, [bumpConditionsVersion]);

  const markDirty = useCallback(() => {
    if (isDirtyRef.current) return;
    isDirtyRef.current = true;
    setIsDirty(true);
  }, []);

  const markClean = useCallback(() => {
    isDirtyRef.current = false;
    setIsDirty(false);
  }, []);
  const phoneGuideVisibleRef = useRef(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const sceneIdRef = useRef<string | null>(null);
  const sceneLabelRef = useRef<string | null>(null);

  const refreshSpriteList = useCallback((r: SceneRenderer) => {
    setSpriteEntries([...r.getSpriteEntries()]);
  }, []);

  const loadScene = useCallback(async (sceneId: string) => {
    try {
      const scene = await scenesApi.get(sceneId);
      const sceneData: Scene = scene.data;

      sceneIdRef.current = scene.id;
      sceneLabelRef.current = scene.label;
      setCurrentSceneId(scene.id);

      rendererRef.current?.destroy();

      if (!canvasRef.current) return;

      const renderer = new SceneRenderer(canvasRef.current);
      await renderer.loadScene(sceneData);
      rendererRef.current = renderer;
      if (phoneGuideVisibleRef.current) renderer.showGuide();

      setZoom(1.0);

      const focus = sceneData.xFocus ?? 0.5;
      setXFocus(focus);
      setYFocus(sceneData.yFocus ?? 0.5);
      setStartTime(sceneData.startTime ?? 0);
      setEndTime(sceneData.endTime ?? 1439);
      setShowSceneControls(true);
      refreshSpriteList(renderer);

      // renderer.loadScene() already selected each sprite's first condition set (if it has any),
      // so these reads already reflect the right override values for sprite 0.
      const firstPos = renderer.getSpritePosition(0);
      const firstScale = renderer.getSpriteScale(0);
      const entries = renderer.getSpriteEntries();
      if (firstPos && entries.length > 0) {
        setSelectedSprite({ index: 0, name: entries[0].name || 'Sprite 0', x: firstPos.x, y: firstPos.y, depth: entries[0].parallaxMultiplier ?? 1.0, width: firstScale?.width ?? 0, height: firstScale?.height ?? 0 });
        renderer.setSelectedSpriteHighlight(0);
      } else {
        setSelectedSprite(null);
        renderer.setSelectedSpriteHighlight(null);
      }
      bumpConditionsVersion();
      markClean();
    } catch (error) {
      console.error('Failed to load scene:', error);
    }
  }, [refreshSpriteList, markClean, bumpConditionsVersion]);

  const saveScene = useCallback(async () => {
    const sceneId = sceneIdRef.current;
    const label = sceneLabelRef.current;
    const data = rendererRef.current?.getSceneData();
    if (!sceneId || !label || !data) return;

    setIsSaving(true);
    try {
      await scenesApi.update(sceneId, label, data);
      const dataUrl = rendererRef.current?.captureSnapshot();
      if (dataUrl) {
        scenesApi.updateThumbnail(sceneId, dataUrl).catch(() => {});
      }
      onNotifyRef.current?.('Scene saved!');
      onSavedRef.current?.();
      markClean();
    } catch (error) {
      console.error('Failed to save scene:', error);
    } finally {
      setIsSaving(false);
    }
  }, [markClean]);

  const handleXFocusChange = useCallback((value: number) => {
    setXFocus(value);
    rendererRef.current?.setScrollOffset(value);
    markDirty();
  }, [markDirty]);

  const handleYFocusChange = useCallback((value: number) => {
    setYFocus(value);
    rendererRef.current?.setYFocus(value);
    markDirty();
  }, [markDirty]);

  const handleStartTimeChange = useCallback((value: number) => {
    setStartTime(value);
    rendererRef.current?.setStartTime(value);
    markDirty();
  }, [markDirty]);

  const handleEndTimeChange = useCallback((value: number) => {
    setEndTime(value);
    rendererRef.current?.setEndTime(value);
    markDirty();
  }, [markDirty]);

  const handlePhoneGuideToggle = useCallback((visible: boolean) => {
    phoneGuideVisibleRef.current = visible;
    setPhoneGuideVisible(visible);
    if (visible) rendererRef.current?.showGuide();
    else rendererRef.current?.hideGuide();
  }, []);

  const handleSpriteToggle = useCallback((index: number) => {
    rendererRef.current?.toggleSpriteByIndex(index);
    if (rendererRef.current) refreshSpriteList(rendererRef.current);
    markDirty();
  }, [refreshSpriteList, markDirty]);

  const handleSpriteSelect = useCallback((index: number) => {
    // Every sprite already shows whatever condition set it has selected (or its plain base
    // values if it has none) regardless of focus, so switching focus is just a read — nothing
    // to enter/exit on the renderer side.
    const pos = rendererRef.current?.getSpritePosition(index);
    const scaleInfo = rendererRef.current?.getSpriteScale(index);
    const name = spriteEntries[index]?.name || `Sprite ${index}`;
    if (pos) {
      setSelectedSprite({ index, name, x: pos.x, y: pos.y, depth: rendererRef.current?.getSpriteParallax(index) ?? 1.0, width: scaleInfo?.width ?? 0, height: scaleInfo?.height ?? 0 });
      rendererRef.current?.setSelectedSpriteHighlight(index);
    }
  }, [spriteEntries]);

  const handleSpritePositionChange = useCallback((x: number, y: number) => {
    if (!rendererRef.current) return;
    setSelectedSprite(prev => {
      if (!prev) return null;
      rendererRef.current!.setSpritePosition(prev.index, x, y);
      return { ...prev, x, y };
    });
    markDirty();
  }, [markDirty]);

  const handleSpriteSizeChange = useCallback((width: number, height: number) => {
    setSelectedSprite(prev => {
      if (!prev) return null;
      rendererRef.current?.setSpriteSize(prev.index, width, height);
      return { ...prev, width, height };
    });
    markDirty();
  }, [markDirty]);

  const handleSpriteDepthChange = useCallback((depth: number) => {
    setSelectedSprite(prev => {
      if (!prev) return null;
      rendererRef.current?.setSpriteParallax(prev.index, depth);
      // Don't re-sort while this sprite has a (non-default) condition set selected — the
      // parallax change is only an override on that condition, not a change to base sort order.
      const selIdx = rendererRef.current?.getSelectedConditionIndex(prev.index);
      const hasSelectedCondition = selIdx !== null && selIdx !== -1;
      if (!hasSelectedCondition) {
        const newIndex = rendererRef.current?.sortSpritesByParallax(prev.index) ?? prev.index;
        if (rendererRef.current) refreshSpriteList(rendererRef.current);
        return { ...prev, index: newIndex, depth };
      }
      return { ...prev, depth };
    });
    markDirty();
  }, [refreshSpriteList, markDirty]);

  const handleSpriteDepthApply = useCallback((depth: number, spriteIndex: number) => {
    if (!rendererRef.current) return;
    rendererRef.current.setSpriteParallax(spriteIndex, depth);
    const newIndex = rendererRef.current.sortSpritesByParallax(spriteIndex);
    refreshSpriteList(rendererRef.current);
    setSelectedSprite(prev => prev ? { ...prev, index: newIndex, depth } : null);
    markDirty();
  }, [refreshSpriteList, markDirty]);

  const handleAddSprite = useCallback(async (textureResource: string) => {
    if (!rendererRef.current) return;
    const newIndex = await rendererRef.current.addSprite(textureResource, 5, 5, 1.0);
    if (newIndex < 0) return;
    refreshSpriteList(rendererRef.current);
    const pos = rendererRef.current.getSpritePosition(newIndex);
    const scaleInfo = rendererRef.current.getSpriteScale(newIndex);
    const entries = rendererRef.current.getSpriteEntries();
    const name = entries[newIndex]?.name || textureResource;
    setSelectedSprite({ index: newIndex, name, x: pos?.x ?? 0, y: pos?.y ?? 0, depth: 1.0, width: scaleInfo?.width ?? 5, height: scaleInfo?.height ?? 5 });
    rendererRef.current.setSelectedSpriteHighlight(newIndex);
    markDirty();
  }, [refreshSpriteList, markDirty]);

  const handleChangeTexture = useCallback(async (index: number, textureResource: string) => {
    await rendererRef.current?.changeTexture(index, textureResource);
    const scaleInfo = rendererRef.current?.getSpriteScale(index);
    if (scaleInfo) {
      setSelectedSprite(prev => prev?.index === index ? { ...prev, width: scaleInfo.width, height: scaleInfo.height } : prev);
    }
    markDirty();
  }, [markDirty]);

  const handleDeleteSprite = useCallback((index: number) => {
    if (!rendererRef.current) return;
    rendererRef.current.removeSpriteByIndex(index);
    refreshSpriteList(rendererRef.current);
    setSelectedSprite(prev => {
      if (!prev) return null;
      if (prev.index === index) return null;
      if (prev.index > index) return { ...prev, index: prev.index - 1 };
      return prev;
    });
    markDirty();
  }, [refreshSpriteList, markDirty]);

  const handleSpriteConditions = useCallback((index: number): SpriteConditionBlock[] => {
    return rendererRef.current?.getSpriteConditions(index) ?? [];
  }, []);

  const handleSaveSpriteConditions = useCallback((index: number, conditions: SpriteConditionBlock[]) => {
    rendererRef.current?.setSpriteConditions(index, conditions);
    markDirty();
  }, [markDirty]);

  const handleAddConditionSet = useCallback((spriteIndex: number) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const newIndex = renderer.addConditionBlock(spriteIndex);
    bumpConditionsVersion();
    markDirty();
    // Select the newly added set — also covers the case where this is the sprite's first
    // condition set, so it never sits unselected once one exists.
    if (newIndex >= 0) {
      handleSelectConditionSet(spriteIndex, newIndex);
    }
  }, [bumpConditionsVersion, markDirty, handleSelectConditionSet]);

  const handleRemoveConditionSet = useCallback((spriteIndex: number, conditionIndex: number) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    // The renderer keeps a sprite with conditions always selected on its own — if the removed
    // set was the selected one, it re-selects a remaining set (or restores base values if that
    // was the last one). We just need to reflect the result if this is the focused sprite.
    renderer.removeConditionBlock(spriteIndex, conditionIndex);
    bumpConditionsVersion();
    markDirty();

    const pos = renderer.getSpritePosition(spriteIndex);
    const scale = renderer.getSpriteScale(spriteIndex);
    const parallax = renderer.getSpriteParallax(spriteIndex);
    if (pos && scale && parallax !== null) {
      setSelectedSprite(prev => (prev && prev.index === spriteIndex)
        ? { ...prev, x: pos.x, y: pos.y, width: scale.width, height: scale.height, depth: parallax }
        : prev);
    }
  }, [bumpConditionsVersion, markDirty]);

  const handleRenameConditionSet = useCallback((spriteIndex: number, conditionIndex: number, name: string) => {
    rendererRef.current?.setConditionBlockName(spriteIndex, conditionIndex, name);
    bumpConditionsVersion();
  }, [bumpConditionsVersion]);

  const handleSetConditionSetFlags = useCallback((spriteIndex: number, conditionIndex: number, conditions: RuleConditionGroup) => {
    rendererRef.current?.setConditionBlockFlags(spriteIndex, conditionIndex, conditions);
    bumpConditionsVersion();
    markDirty();
  }, [bumpConditionsVersion, markDirty]);

  const handleRenameSprite = useCallback((index: number, newName: string) => {
    if (!rendererRef.current) return;

    rendererRef.current.renameSpriteByIndex(index, newName);
    refreshSpriteList(rendererRef.current);
    setSelectedSprite(prev => prev?.index === index ? { ...prev, name: newName } : prev);

    const spriteId = rendererRef.current.getSpriteEntries()[index]?.id;
    if (spriteId) {
      spritesApi.rename(spriteId, newName).catch(console.error);
    }
  }, [refreshSpriteList]);

  const ZOOM_FACTOR = 1.25;

  const handleZoomIn = useCallback(() => {
    rendererRef.current?.zoomAtCenter(ZOOM_FACTOR);
    setZoom(rendererRef.current?.getZoom() ?? 1.0);
  }, []);

  const handleZoomOut = useCallback(() => {
    rendererRef.current?.zoomAtCenter(1 / ZOOM_FACTOR);
    setZoom(rendererRef.current?.getZoom() ?? 1.0);
  }, []);

  const handleZoomAtPoint = useCallback((cssX: number, cssY: number, factor: number) => {
    if (factor >= 1) {
      rendererRef.current?.zoomAt(cssX, cssY, factor);
    } else {
      rendererRef.current?.zoomAtCenter(factor);
    }
    setZoom(rendererRef.current?.getZoom() ?? 1.0);
  }, []);

  const handleCenter = useCallback(() => {
    rendererRef.current?.resetView();
    setZoom(1.0);
  }, []);

  const [gyroMode, setGyroMode] = useState(false);

  const handleGyroModeToggle = useCallback(() => {
    setGyroMode(prev => {
      if (prev) {
        rendererRef.current?.clearGyroOffset();
        rendererRef.current?.disableGyroScaling();
      } else {
        rendererRef.current?.enableGyroScaling();
      }
      return !prev;
    });
  }, []);

  const handleGyroOffset = useCallback((deltaX: number, deltaY: number, canvasWidth: number, canvasHeight: number) => {
    // Map a drag delta to gyro offsets clamped to ±0.5 world units (matching Android's motionOffsetLimit).
    // Dragging 2/3 of the canvas width/height reaches the ±0.5 maximum (factor = 0.5 * 1.5 = 0.75).
    const gyroX = (deltaX / canvasWidth) * 2;
    const gyroY = (deltaY / canvasHeight) * 2;
    rendererRef.current?.setGyroOffset(gyroX, gyroY);
  }, []);

  return {
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
    handleSpriteConditions,
    handleSaveSpriteConditions,
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
  };
}

