import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SceneRenderer } from './renderers/SceneRenderer';
import { SceneEditorPanel, SceneOption } from './SceneEditorPanel';
import type { SpriteEntry } from './controls/SpriteListPanel';
import type { Scene } from './interfaces/Scene';

interface ScenePageProps {
  scenes: SceneOption[];
}

export function ScenePage({ scenes }: ScenePageProps) {
  const [showSceneControls, setShowSceneControls] = useState(false);
  const [xFocus, setXFocus] = useState(0.5);
  const [spriteEntries, setSpriteEntries] = useState<SpriteEntry[]>([]);
  const [selectedSprite, setSelectedSprite] = useState<{ index: number; name: string; x: number; y: number } | null>(null);
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
    if (selectedSprite === null) return;
    rendererRef.current?.setSpritePosition(selectedSprite.index, x, y);
    setSelectedSprite(prev => prev ? { ...prev, x, y } : null);
  }, [selectedSprite]);

  const ARROW_STEP = 0.05;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSprite) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      // Don't hijack arrow keys when focused on an input
      if (document.activeElement instanceof HTMLInputElement) return;

      e.preventDefault();
      setSelectedSprite(prev => {
        if (!prev) return null;
        let { x, y } = prev;
        if (e.key === 'ArrowLeft')  x -= ARROW_STEP;
        if (e.key === 'ArrowRight') x += ARROW_STEP;
        if (e.key === 'ArrowUp')    y -= ARROW_STEP;
        if (e.key === 'ArrowDown')  y += ARROW_STEP;
        x = Math.round(x / ARROW_STEP) * ARROW_STEP;
        y = Math.round(y / ARROW_STEP) * ARROW_STEP;
        rendererRef.current?.setSpritePosition(prev.index, x, y);
        return { ...prev, x, y };
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSprite]);

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
      />
      <div className="main-content">
        <div id="canvas-container" ref={canvasRef} />
      </div>
    </>
  );
}

