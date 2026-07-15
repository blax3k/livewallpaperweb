import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { SceneEditorPanel } from './controls/panels/SceneEditorPanel';
import { SlotEditorPanel } from './controls/panels/SlotEditorPanel';
import { SceneFlagsPlayground } from './controls/panels/SceneFlagsPlayground';
import { TopBar } from './controls/TopBar';
import { NotificationStack } from './controls/NotificationStack';
import { EditTextureModal } from './controls/modals/EditTextureModal';
import './ScenePage.scss';
import { useUndoHistory } from './hooks/useUndoHistory';
import { useNotifications } from './hooks/useNotifications';
import { useSceneRenderer } from './hooks/useSceneRenderer';
import { useSpriteDrag } from './hooks/useSpriteDrag';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { computeSceneSize, collectTextureResources, formatBytes } from './utils/sceneSize';
import { flagsApi, imagesApi } from './api';
import type { FlagDefinition, SceneSlot, SlotOption } from '@livewallpaper/types';
import { matchesConditionGroup, type WorldState } from './ruleEngine';
import { createSlot, createOptionFromTexture, mapSlot, mapOption, setOptionGates } from './slotOps';
import { useSlotDrag } from './hooks/useSlotDrag';
import type { SlotPreviewGroup } from './renderers/SceneRenderer';
import { SlotCyclerPill } from './controls/panels/SlotCyclerPill';

interface ScenePageProps {
  initialSceneId?: string;
  projectId: string;
  onBack?: () => void;
  onSaved?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function ScenePage({ initialSceneId, projectId, onBack, onSaved, onDirtyChange }: ScenePageProps) {
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
  // Slot authoring UI state (ephemeral — never persisted to the scene).
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [expandedSlotIds, setExpandedSlotIds] = useState<ReadonlySet<string>>(new Set());
  // Preview-only world-state for the Scene-flags playground. Seeded from each flag's default so
  // the Layers list reflects a plausible "current" eligibility before the playground (Phase 3)
  // lets the user toggle flags. Toggling never writes back to the scene.
  const [previewFlags, setPreviewFlags] = useState<ReadonlySet<string>>(new Set());
  // Which option each slot previews on the canvas (cycler position). Only meaningful for the
  // selected slot; other slots resolve to their first eligible option.
  const [previewOptionIndexBySlot, setPreviewOptionIndexBySlot] = useState<Record<string, number>>({});

  const {
    canvasRef,
    rendererRef,
    showSceneControls,
    currentSceneLabel,
    xFocus,
    yFocus,
    spriteEntries,
    slots,
    updateSlots,
    selectedSprite,
    setSelectedSprite,
    isSaving,
    isDirty,
    markDirty,
    guideAspectRatio,
    orientation,
    handleOrientationToggle,
    loadScene,
    saveScene,
    handleXFocusChange,
    handleYFocusChange,
    handleGuideAspectRatioChange,
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
    handleRenameScene,
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
    // Undo/redo of a slots snapshot — apply directly (updateSlots does not re-push to history).
    onSlotsApply: (slots) => updateSlots(() => slots),
    onMarkDirty: markDirty,
  });

  useEffect(() => {
    if (!projectId) return;
    flagsApi.list(projectId).then((flags) => {
      setAvailableFlags(flags);
      setPreviewFlags(new Set(flags.filter(f => f.defaultActive).map(f => f.id)));
    }).catch(() => {});
  }, [projectId]);

  // A minimal world for evaluating slot-option gates in the Layers list. Gates are flag-only, so
  // the clock/counts are placeholders; only `activeFlags` (the preview toggles) matters here.
  const previewWorld = useMemo<WorldState>(() => ({
    clock: { currentHour: 0, currentMinuteOfDay: 0, dayOfWeekNum: 0, installHours: 0 },
    activeFlags: previewFlags,
    sceneCounts: {},
    flagChanges: {},
  }), [previewFlags]);

  const isOptionEligible = useCallback(
    (_slotId: string, option: SlotOption) => matchesConditionGroup(option.conditions, previewWorld),
    [previewWorld],
  );

  const handleSelectSlot = useCallback((slotId: string) => {
    setSelectedSlotId(slotId);
    // A slot and a base sprite can't be co-selected — clear the sprite selection & canvas highlight.
    setSelectedSprite(null);
    rendererRef.current?.setSelectedSpriteHighlight(null);
    setExpandedSlotIds((prev) => {
      if (prev.has(slotId)) return prev;
      const next = new Set(prev);
      next.add(slotId);
      return next;
    });
  }, [setSelectedSprite, rendererRef]);

  const handleToggleSlotExpand = useCallback((slotId: string) => {
    setExpandedSlotIds((prev) => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  }, []);

  // Selecting a base sprite clears any slot selection so the two stay mutually exclusive.
  const handleSelectSpriteFromLayers = useCallback((index: number) => {
    setSelectedSlotId(null);
    handleSpriteSelect(index);
  }, [handleSpriteSelect]);

  // Canvas clicks/drags select a sprite through the renderer directly; clear any slot selection so
  // a slot row and a sprite can't both look selected.
  useEffect(() => {
    if (selectedSprite) setSelectedSlotId(null);
  }, [selectedSprite]);

  const selectedSlot = slots.find(s => s.id === selectedSlotId) ?? null;

  // ── Slot mutations ──────────────────────────────────────────────────────────────────────────
  // All slot edits go through here: persists + marks dirty (updateSlots) and records a before/after
  // snapshot on the undo stack. Undo/redo replay via onSlotsApply (which does NOT re-push).
  const applySlots = useCallback((updater: (slots: SceneSlot[]) => SceneSlot[]) => {
    const before = [...(rendererRef.current?.getSlots() ?? [])];
    const after = updater(before);
    updateSlots(() => after);
    history.push({ type: 'slots', before, after });
  }, [updateSlots, history, rendererRef]);

  const handleAddSlot = useCallback(() => {
    const existing = new Set(slots.map(s => s.name));
    let n = existing.size + 1;
    let name = `slot ${n}`;
    while (existing.has(name)) name = `slot ${++n}`;
    const slot = createSlot(name);
    applySlots(s => [...s, slot]);
    setSelectedSprite(null);
    rendererRef.current?.setSelectedSpriteHighlight(null);
    setSelectedSlotId(slot.id);
    setExpandedSlotIds(prev => new Set(prev).add(slot.id));
  }, [slots, applySlots, setSelectedSprite, rendererRef]);

  const handleRenameSlot = useCallback((slotId: string, name: string) => {
    applySlots(s => mapSlot(s, slotId, sl => ({ ...sl, name })));
  }, [applySlots]);

  const handleDeleteSlot = useCallback((slotId: string) => {
    applySlots(s => s.filter(sl => sl.id !== slotId));
    setSelectedSlotId(prev => (prev === slotId ? null : prev));
    setExpandedSlotIds(prev => {
      if (!prev.has(slotId)) return prev;
      const next = new Set(prev);
      next.delete(slotId);
      return next;
    });
  }, [applySlots]);

  const handleAddOption = useCallback((slotId: string, textureResource: string) => {
    const name = textureResource.replace(/^.*\//, '').replace(/\.[^.]+$/, '') || 'sprite';
    const option = createOptionFromTexture(textureResource, name);
    applySlots(s => mapSlot(s, slotId, sl => ({ ...sl, options: [...sl.options, option] })));
  }, [applySlots]);

  const handleRemoveOption = useCallback((slotId: string, optionId: string) => {
    applySlots(s => mapSlot(s, slotId, sl => ({ ...sl, options: sl.options.filter(o => o.id !== optionId) })));
  }, [applySlots]);

  const handleRenameOption = useCallback((slotId: string, optionId: string, name: string) => {
    applySlots(s => mapSlot(s, slotId, sl => ({
      ...sl,
      options: sl.options.map(o => (o.id === optionId ? { ...o, name } : o)),
    })));
  }, [applySlots]);

  const handleSetGates = useCallback((slotId: string, optionId: string, showFlagIds: string[], hideFlagIds: string[]) => {
    applySlots(s => setOptionGates(s, slotId, optionId, showFlagIds, hideFlagIds));
  }, [applySlots]);

  // Scene-flags playground toggle — preview-only, never written to the scene.
  const handleTogglePreviewFlag = useCallback((flagId: string) => {
    setPreviewFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flagId)) next.delete(flagId);
      else next.add(flagId);
      return next;
    });
  }, []);

  // ── Canvas slot preview (composite + frame + cycler) ────────────────────────────────────────
  // The previewed option index for a slot: explicit cycler value, else its first eligible option.
  const resolvePreviewIndex = useCallback((slot: SceneSlot): number => {
    const explicit = previewOptionIndexBySlot[slot.id];
    if (explicit != null && explicit >= 0 && explicit < slot.options.length) return explicit;
    const firstEligible = slot.options.findIndex(o => isOptionEligible(slot.id, o));
    return firstEligible >= 0 ? firstEligible : 0;
  }, [previewOptionIndexBySlot, isOptionEligible]);

  // What each slot draws: the selected slot follows its cycler; others resolve to first eligible.
  const slotPreviewGroups = useMemo<SlotPreviewGroup[]>(() => {
    const groups: SlotPreviewGroup[] = [];
    for (const slot of slots) {
      const option = slot.id === selectedSlotId
        ? slot.options[resolvePreviewIndex(slot)]
        : slot.options.find(o => isOptionEligible(slot.id, o));
      if (option?.sprites?.length) {
        groups.push({
          sprites: option.sprites,
          dim: !isOptionEligible(slot.id, option),
          frame: slot.id === selectedSlotId,
        });
      }
    }
    return groups;
  }, [slots, selectedSlotId, resolvePreviewIndex, isOptionEligible]);

  useEffect(() => {
    if (!showSceneControls) return;
    rendererRef.current?.renderSlotPreview(slotPreviewGroups);
  }, [slotPreviewGroups, showSceneControls, rendererRef]);

  const cycleSelectedSlot = useCallback((delta: number) => {
    if (!selectedSlot) return;
    const n = selectedSlot.options.length;
    if (n === 0) return;
    const current = resolvePreviewIndex(selectedSlot);
    setPreviewOptionIndexBySlot(prev => ({ ...prev, [selectedSlot.id]: (current + delta + n) % n }));
  }, [selectedSlot, resolvePreviewIndex]);

  // Drag-to-move the selected slot's framed sprite; commit shifts that option's sprites (undoable).
  const { startSlotDrag } = useSlotDrag({
    rendererRef,
    onCommit: (dx, dy) => {
      if (!selectedSlot) return;
      const option = selectedSlot.options[resolvePreviewIndex(selectedSlot)];
      if (!option?.sprites?.length) return;
      applySlots(s => mapOption(s, selectedSlot.id, option.id, o => ({
        ...o,
        sprites: o.sprites?.map(sp => ({ ...sp, positionX: sp.positionX + dx, positionY: sp.positionY + dy })),
      })));
    },
  });

  // Canvas mousedown: when a slot is selected and the click lands on its frame, drag the slot
  // sprite; otherwise fall through to the base-sprite drag.
  const handleCanvasPointerDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const renderer = rendererRef.current;
    if (selectedSlot && renderer) {
      const canvas = renderer.getCanvas();
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        if (renderer.hitTestSlotFrame(cssX, cssY)) {
          e.preventDefault();
          startSlotDrag(cssX, cssY);
          return;
        }
      }
    }
    handleCanvasMouseDown(e);
  }, [selectedSlot, rendererRef, startSlotDrag, handleCanvasMouseDown]);

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
    <div className="scene-page">
      <TopBar
        projectId={projectId}
        sceneLabel={currentSceneLabel}
        sceneLoaded={showSceneControls}
        isSaving={isSaving}
        guideAspectRatio={guideAspectRatio}
        orientation={orientation}
        onBack={handleBack}
        onRenameScene={handleRenameScene}
        onGuideAspectRatioChange={handleGuideAspectRatioChange}
        onOrientationToggle={handleOrientationToggle}
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
      <div className="scene-page__row">
        <SceneEditorPanel
          sceneLoaded={showSceneControls}
          orientation={orientation}
          xFocus={xFocus}
          yFocus={yFocus}
          projectId={projectId}
          spriteEntries={spriteEntries}
          slots={slots}
          selectedSlotId={selectedSlotId}
          expandedSlotIds={expandedSlotIds}
          isOptionEligible={isOptionEligible}
          onSelectSlot={handleSelectSlot}
          onToggleSlotExpand={handleToggleSlotExpand}
          onAddSlot={handleAddSlot}
          selectedSprite={selectedSprite}
          onXFocusChange={handleXFocusChange}
          onXFocusChangeStart={handleXFocusChangeStart}
          onXFocusCommit={handleXFocusCommit}
          onYFocusChange={handleYFocusChange}
          onYFocusChangeStart={handleYFocusChangeStart}
          onYFocusCommit={handleYFocusCommit}
          onSpriteToggle={handleSpriteToggle}
          onSpriteSelect={handleSelectSpriteFromLayers}
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
        <div className="scene-page__canvas">
          <div
            id="canvas-container"
            ref={canvasRef}
            className="scene-page__canvas-inner"
            onMouseDown={gyroMode ? undefined : handleCanvasPointerDown}
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
          {selectedSlot && (
            <SlotCyclerPill
              slot={selectedSlot}
              optionIndex={resolvePreviewIndex(selectedSlot)}
              onPrev={() => cycleSelectedSlot(-1)}
              onNext={() => cycleSelectedSlot(1)}
            />
          )}
        </div>
        {showSceneControls && (
          <div className="scene-page__right-rail">
            <SlotEditorPanel
              slot={selectedSlot}
              availableFlags={availableFlags}
              projectId={projectId}
              isOptionEligible={(option) => isOptionEligible(selectedSlot?.id ?? '', option)}
              onRenameSlot={handleRenameSlot}
              onDeleteSlot={handleDeleteSlot}
              onAddOption={handleAddOption}
              onRemoveOption={handleRemoveOption}
              onRenameOption={handleRenameOption}
              onSetGates={handleSetGates}
            />
            <SceneFlagsPlayground
              availableFlags={availableFlags}
              previewFlags={previewFlags}
              onToggleFlag={handleTogglePreviewFlag}
              selectedSlot={selectedSlot}
              isOptionEligible={(option) => isOptionEligible(selectedSlot?.id ?? '', option)}
            />
          </div>
        )}
      </div>

      <div className="scene-page__toast-wrap">
        <NotificationStack notifications={notifications} />
      </div>

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
    </div>
  );
}

