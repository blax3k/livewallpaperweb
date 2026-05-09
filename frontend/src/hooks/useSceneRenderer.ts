import { useState, useRef, useCallback } from 'react';
import { SceneRenderer } from '../renderers/SceneRenderer';
import type { SpriteEntry } from '../controls/SpriteListPanel';
import type { Scene } from '../interfaces/Scene';

export interface SelectedSprite {
  index: number;
  name: string;
  x: number;
  y: number;
  depth: number;
  width: number;
  height: number;
}

export function useSceneRenderer(onNotify?: (message: string) => void) {
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [xFocus, setXFocus] = useState(0.5);
  const [spriteEntries, setSpriteEntries] = useState<SpriteEntry[]>([]);
  const [selectedSprite, setSelectedSprite] = useState<SelectedSprite | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneGuideVisible, setPhoneGuideVisible] = useState(true);
  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;
  const phoneGuideVisibleRef = useRef(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const sceneIdRef = useRef<string | null>(null);
  const sceneNameRef = useRef<string | null>(null);
  const sceneLabelRef = useRef<string | null>(null);

  const refreshSpriteList = useCallback((r: SceneRenderer) => {
    setSpriteEntries([...r.getSpriteEntries()]);
  }, []);

  const loadScene = useCallback(async (sceneName: string) => {
    try {
      const response = await fetch(`/api/scenes/${sceneName}`);
      const row: { id: string; name: string; label: string; data: Scene } = await response.json();
      const sceneData: Scene = row.data;

      sceneIdRef.current = row.id;
      sceneNameRef.current = row.name;
      sceneLabelRef.current = row.label;

      rendererRef.current?.destroy();

      if (!canvasRef.current) return;

      const renderer = new SceneRenderer(canvasRef.current);
      await renderer.loadScene(sceneData);
      rendererRef.current = renderer;
      if (phoneGuideVisibleRef.current) renderer.showGuide();

      const focus = sceneData.xFocus ?? 0.5;
      setXFocus(focus);
      setShowSceneControls(true);
      refreshSpriteList(renderer);

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
    } catch (error) {
      console.error('Failed to load scene:', error);
    }
  }, [refreshSpriteList]);

  const saveScene = useCallback(async () => {
    const name = sceneNameRef.current;
    const label = sceneLabelRef.current;
    const data = rendererRef.current?.getSceneData();
    if (!name || !label || !data) return;

    setIsSaving(true);
    try {
      await fetch(`/api/scenes/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, data }),
      });
      onNotifyRef.current?.('Scene saved!');
    } catch (error) {
      console.error('Failed to save scene:', error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleXFocusChange = useCallback((value: number) => {
    setXFocus(value);
    rendererRef.current?.setScrollOffset(value);
  }, []);

  const handlePhoneGuideToggle = useCallback((visible: boolean) => {
    phoneGuideVisibleRef.current = visible;
    setPhoneGuideVisible(visible);
    if (visible) rendererRef.current?.showGuide();
    else rendererRef.current?.hideGuide();
  }, []);

  const handleSpriteToggle = useCallback((index: number) => {
    rendererRef.current?.toggleSpriteByIndex(index);
    if (rendererRef.current) refreshSpriteList(rendererRef.current);
  }, [refreshSpriteList]);

  const handleSpriteSelect = useCallback((index: number) => {
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
  }, []);

  const handleSpriteSizeChange = useCallback((width: number, height: number) => {
    setSelectedSprite(prev => {
      if (!prev) return null;
      rendererRef.current?.setSpriteSize(prev.index, width, height);
      return { ...prev, width, height };
    });
  }, []);

  const handleSpriteDepthChange = useCallback((depth: number) => {
    setSelectedSprite(prev => {
      if (!prev) return null;
      rendererRef.current?.setSpriteParallax(prev.index, depth);
      const newIndex = rendererRef.current?.sortSpritesByParallax(prev.index) ?? prev.index;
      if (rendererRef.current) refreshSpriteList(rendererRef.current);
      return { ...prev, index: newIndex, depth };
    });
  }, [refreshSpriteList]);

  const handleSpriteDepthApply = useCallback((depth: number, spriteIndex: number) => {
    if (!rendererRef.current) return;
    rendererRef.current.setSpriteParallax(spriteIndex, depth);
    const newIndex = rendererRef.current.sortSpritesByParallax(spriteIndex);
    refreshSpriteList(rendererRef.current);
    setSelectedSprite(prev => prev ? { ...prev, index: newIndex, depth } : null);
  }, [refreshSpriteList]);

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
  }, [refreshSpriteList]);

  return {
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
    handleAddSprite,
  };
}

