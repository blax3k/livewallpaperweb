import { useState, useRef, useCallback } from 'react';
import { SceneRenderer } from '../renderers/SceneRenderer';
import type { SpriteEntry } from '../controls/SpriteListPanel';
import type { Scene } from '../interfaces/Scene';

export interface SelectedSprite {
  index: number;
  name: string;
  x: number;
  y: number;
}

export function useSceneRenderer() {
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [xFocus, setXFocus] = useState(0.5);
  const [spriteEntries, setSpriteEntries] = useState<SpriteEntry[]>([]);
  const [selectedSprite, setSelectedSprite] = useState<SelectedSprite | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);

  const refreshSpriteList = useCallback((r: SceneRenderer) => {
    setSpriteEntries([...r.getSpriteEntries()]);
  }, []);

  const loadScene = useCallback(async (sceneName: string) => {
    try {
      const response = await fetch(`/scenes/${sceneName}.json`);
      const sceneData: Scene = await response.json();

      rendererRef.current?.destroy();

      if (!canvasRef.current) return;

      const renderer = new SceneRenderer(canvasRef.current);
      await renderer.loadScene(sceneData);
      rendererRef.current = renderer;

      const focus = sceneData.xFocus ?? 0.5;
      setXFocus(focus);
      setShowSceneControls(true);
      refreshSpriteList(renderer);

      const firstPos = renderer.getSpritePosition(0);
      const entries = renderer.getSpriteEntries();
      if (firstPos && entries.length > 0) {
        setSelectedSprite({ index: 0, name: entries[0].name || 'Sprite 0', x: firstPos.x, y: firstPos.y });
        renderer.setSelectedSpriteHighlight(0);
      } else {
        setSelectedSprite(null);
        renderer.setSelectedSpriteHighlight(null);
      }
    } catch (error) {
      console.error('Failed to load scene:', error);
    }
  }, [refreshSpriteList]);

  const handleXFocusChange = useCallback((value: number) => {
    setXFocus(value);
    rendererRef.current?.setScrollOffset(value);
  }, []);

  const handlePhoneGuideToggle = useCallback((visible: boolean) => {
    if (visible) rendererRef.current?.showGuide();
    else rendererRef.current?.hideGuide();
  }, []);

  const handleSpriteToggle = useCallback((index: number) => {
    rendererRef.current?.toggleSpriteByIndex(index);
    if (rendererRef.current) refreshSpriteList(rendererRef.current);
  }, [refreshSpriteList]);

  const handleSpriteSelect = useCallback((index: number) => {
    const pos = rendererRef.current?.getSpritePosition(index);
    const name = spriteEntries[index]?.name || `Sprite ${index}`;
    if (pos) {
      setSelectedSprite({ index, name, x: pos.x, y: pos.y });
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

  return {
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
  };
}
