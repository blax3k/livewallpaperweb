import React, { useState, useRef, useCallback } from 'react';
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
  const [selectedSpriteIndex, setSelectedSpriteIndex] = useState<number | null>(null);
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

      const r = new SceneRenderer(canvasRef.current);
      await r.loadScene(sceneData);
      rendererRef.current = r;

      const focus = sceneData.xFocus ?? 0.5;
      setXFocus(focus);
      setShowSceneControls(true);
      setSelectedSpriteIndex(null);
      refreshSpriteList(r);
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
    setSelectedSpriteIndex(index);
  }, []);

  return (
    <>
      <SceneEditorPanel
        scenes={scenes}
        showSceneControls={showSceneControls}
        xFocus={xFocus}
        spriteEntries={spriteEntries}
        selectedSpriteIndex={selectedSpriteIndex}
        onSceneSelect={loadScene}
        onXFocusChange={handleXFocusChange}
        onPhoneGuideToggle={handlePhoneGuideToggle}
        onSpriteToggle={handleSpriteToggle}
        onSpriteSelect={handleSpriteSelect}
      />
      <div className="main-content">
        <div id="canvas-container" ref={canvasRef} />
      </div>
    </>
  );
}

