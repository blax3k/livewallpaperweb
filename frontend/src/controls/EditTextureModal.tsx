import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import {
  calculateTexCoords,
  buildTexCoordArray,
  clampTexOffset,
  extractInitialScale,
} from '../renderers/TextureCoordinateCalculator';
import './EditTextureModal.scss';
import { Button } from '../components/Button';

interface EditTextureModalProps {
  spriteName: string;
  textureResource: string;
  texCoordinates: number[];
  width: number;
  height: number;
  onApply: (texCoords: number[], width: number, height: number) => void;
  onClose: () => void;
}

interface TexEditState {
  width: number;
  height: number;
  textureScale: number;
  offsetU: number;
  offsetV: number;
}

function imageUrlFromResource(textureResource: string): string {
  if (textureResource.startsWith('/')) return textureResource;
  return /\.(png|jpg|jpeg|gif|webp)$/i.test(textureResource)
    ? `/images/${textureResource}`
    : `/images/${textureResource}.png`;
}

// Internal PixiJS canvas resolution (CSS px). CSS scaling fills the container.
const PIXI_SIZE = 600;

const WIDTH_MIN = 0.1;
const WIDTH_MAX = 15;
const WIDTH_STEP = 0.1;
const SCALE_MIN = 1.0;
const SCALE_MAX = 8.0;
const SCALE_STEP = 0.1;

export function EditTextureModal({
  spriteName,
  textureResource,
  texCoordinates,
  width: initWidth,
  height: initHeight,
  onApply,
  onClose,
}: EditTextureModalProps) {
  // Frozen baselines — never change during the edit session
  const originalTexCoords = useRef<number[]>(texCoordinates);
  const originalWidth = useRef<number>(initWidth);
  const originalHeight = useRef<number>(initHeight);

  const [state, setState] = useState<TexEditState>(() => ({
    width: initWidth,
    height: initHeight,
    textureScale: extractInitialScale(texCoordinates),
    offsetU: 0,
    offsetV: 0,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  // PixiJS refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<PIXI.Application | null>(null);
  const pixiSpriteRef = useRef<PIXI.Sprite | null>(null);
  const pixiHighlightRef = useRef<PIXI.Graphics | null>(null);
  const baseTextureRef = useRef<PIXI.Texture | null>(null);

  // Drag state
  const dragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // ------------------------------------------------------------------
  // Update the PIXI sprite's texture frame + dimensions + edge highlight
  // ------------------------------------------------------------------
  const updatePixiSprite = useCallback((s: TexEditState) => {
    const sprite = pixiSpriteRef.current;
    const highlight = pixiHighlightRef.current;
    const baseTexture = baseTextureRef.current;
    const app = pixiAppRef.current;
    if (!sprite || !baseTexture || !app) return;

    const canvasSize = app.renderer.width / (window.devicePixelRatio || 1);

    const win = calculateTexCoords(
      originalTexCoords.current,
      s.textureScale,
      s.width,
      s.height,
      originalWidth.current,
      originalHeight.current,
      s.offsetU,
      s.offsetV,
    );

    // Apply UV crop as texture frame — identical to SceneRenderer.createSprite
    sprite.texture = new PIXI.Texture({
      source: baseTexture.source,
      frame: new PIXI.Rectangle(
        win.uMin * baseTexture.width,
        win.vMin * baseTexture.height,
        (win.uMax - win.uMin) * baseTexture.width,
        (win.vMax - win.vMin) * baseTexture.height,
      ),
    });

    // Fit sprite into the square canvas preserving world-space aspect ratio (like Android)
    const padding = 0.85;
    const scaleFit = Math.min(
      (canvasSize * padding) / s.width,
      (canvasSize * padding) / s.height,
    );
    sprite.width = s.width * scaleFit;
    sprite.height = s.height * scaleFit;
    sprite.x = canvasSize / 2;
    sprite.y = canvasSize / 2;

    // Draw green edge highlight (matches Android setShowEdgeHighlight)
    if (highlight) {
      highlight.clear();
      const left = sprite.x - sprite.width / 2;
      const top = sprite.y - sprite.height / 2;
      highlight
        .moveTo(left, top)
        .lineTo(left + sprite.width, top)
        .lineTo(left + sprite.width, top + sprite.height)
        .lineTo(left, top + sprite.height)
        .lineTo(left, top)
        .stroke({ color: 0x00ff00, width: 2, alpha: 0.85 });
    }
  }, []);

  // ------------------------------------------------------------------
  // Init PixiJS app + load texture + create sprite
  // ------------------------------------------------------------------
  useEffect(() => {
    let app: PIXI.Application | null = null;
    let cancelled = false;

    const init = async () => {
      if (!containerRef.current) return;

      const size = containerRef.current.clientWidth || PIXI_SIZE;

      app = new PIXI.Application();
      await app.init({
        width: size,
        height: size,
        backgroundColor: 0x111111,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      if (cancelled) { app.destroy(true); return; }

      containerRef.current.appendChild(app.canvas);
      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.style.display = 'block';
      pixiAppRef.current = app;

      const texture = await PIXI.Assets.load(imageUrlFromResource(textureResource));
      if (cancelled) { app.destroy(true); return; }

      baseTextureRef.current = texture;

      const sprite = new PIXI.Sprite();
      sprite.anchor.set(0.5);
      app.stage.addChild(sprite);
      pixiSpriteRef.current = sprite;

      const highlight = new PIXI.Graphics();
      app.stage.addChild(highlight);
      pixiHighlightRef.current = highlight;

      updatePixiSprite(stateRef.current);
    };

    init();

    return () => {
      cancelled = true;
      pixiSpriteRef.current = null;
      pixiHighlightRef.current = null;
      baseTextureRef.current = null;
      pixiAppRef.current = null;
      // Destroy asynchronously to avoid destroying before init finishes
      if (app) {
        setTimeout(() => app!.destroy(true), 0);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textureResource]);

  // Sync PixiJS sprite whenever state changes
  useEffect(() => {
    updatePixiSprite(state);
  }, [state, updatePixiSprite]);

  // ------------------------------------------------------------------
  // Global drag handlers
  // ------------------------------------------------------------------
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      const rect = containerRef.current.getBoundingClientRect();
      const s = stateRef.current;
      // Same sign convention as Android: negate delta so dragging moves the texture
      const [newOffU, newOffV] = clampTexOffset(
        s.offsetU,
        s.offsetV,
        -(dx / rect.width),
        -(dy / rect.height),
        s.width,
        s.height,
        originalWidth.current,
        originalHeight.current,
        s.textureScale,
        originalTexCoords.current,
      );
      setState(prev => ({ ...prev, offsetU: newOffU, offsetV: newOffV }));
    };

    const onUp = () => { dragging.current = false; };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    dragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleApply = () => {
    const s = stateRef.current;
    const win = calculateTexCoords(
      originalTexCoords.current,
      s.textureScale,
      s.width,
      s.height,
      originalWidth.current,
      originalHeight.current,
      s.offsetU,
      s.offsetV,
    );
    onApply(buildTexCoordArray(win), s.width, s.height);
  };

  return (
    <div className="edit-texture-overlay">
      <div className="edit-texture-modal">

        <div className="edit-texture-header">
          <span>Edit Texture — {spriteName}</span>
          <button className="edit-texture-close" onClick={onClose}>✕</button>
        </div>

        <div className="edit-texture-body">
          {/* Controls panel */}
          <div className="edit-texture-controls">
            <p className="edit-texture-hint">Drag the preview to pan the texture</p>

            <div className="edit-texture-row">
              <label>Width</label>
              <input
                type="range"
                min={WIDTH_MIN}
                max={WIDTH_MAX}
                step={WIDTH_STEP}
                value={state.width}
                onChange={e => setState(prev => ({ ...prev, width: parseFloat(e.target.value) }))}
              />
              <input
                type="number"
                min={WIDTH_MIN}
                max={WIDTH_MAX}
                step={WIDTH_STEP}
                value={parseFloat(state.width.toFixed(1))}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setState(prev => ({ ...prev, width: Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, v)) }));
                }}
              />
            </div>

            <div className="edit-texture-row">
              <label>Height</label>
              <input
                type="range"
                min={WIDTH_MIN}
                max={WIDTH_MAX}
                step={WIDTH_STEP}
                value={state.height}
                onChange={e => setState(prev => ({ ...prev, height: parseFloat(e.target.value) }))}
              />
              <input
                type="number"
                min={WIDTH_MIN}
                max={WIDTH_MAX}
                step={WIDTH_STEP}
                value={parseFloat(state.height.toFixed(1))}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) setState(prev => ({ ...prev, height: Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, v)) }));
                }}
              />
            </div>

            <div className="edit-texture-row">
              <label>Tex Scale</label>
              <input
                type="range"
                min={SCALE_MIN}
                max={SCALE_MAX}
                step={SCALE_STEP}
                value={state.textureScale}
                onChange={e =>
                  setState(prev => ({ ...prev, textureScale: parseFloat(e.target.value) }))
                }
              />
              <input
                type="number"
                min={SCALE_MIN}
                max={SCALE_MAX}
                step={SCALE_STEP}
                value={parseFloat(state.textureScale.toFixed(1))}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v))
                    setState(prev => ({
                      ...prev,
                      textureScale: Math.max(SCALE_MIN, Math.min(SCALE_MAX, v)),
                    }));
                }}
              />
            </div>
          </div>

          {/* PixiJS preview — fills height, stays square */}
          <div
            className="edit-texture-preview"
            ref={containerRef}
            onMouseDown={handleMouseDown}
          />
        </div>

        <div className="edit-texture-footer">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleApply}>Apply</Button>
        </div>

      </div>
    </div>
  );
}

