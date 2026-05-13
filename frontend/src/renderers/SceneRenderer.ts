import * as PIXI from 'pixi.js';
import { Scene, Sprite } from '../interfaces/Scene';
import { PhoneGuide } from './PhoneGuide';
import type { SpriteEntry } from '../controls/SpriteListPanel';

interface SpriteMetadata {
  x: number;
  y: number;
  parallaxMultiplier: number;
  name: string;
  textureResource: string;
  visible: boolean;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Renderer for live wallpaper scenes using PixiJS
 * Converts scene JSON data into rendered PixiJS sprites with parallax support
 */
export class SceneRenderer {
  private app: PIXI.Application | null = null;
  private sprites: PIXI.Sprite[] = [];
  private spriteMetadata: Map<PIXI.Sprite, SpriteMetadata> = new Map();
  private textures: Map<string, PIXI.Texture> = new Map();
  private container: HTMLElement;
  private resizeHandler: () => void;
  private phoneGuide: PhoneGuide | null = null;
  private showPhoneGuideFlag: boolean = false;
  private currentXFocus: number = 0.5;
  private selectionHighlight: PIXI.Graphics | null = null;
  private selectedHighlightIndex: number | null = null;
  private readonly ZOOM_SCALE = 1.6;
  private userZoom: number = 1.0;
  private baseStageX: number = 0;
  private baseStageY: number = 0;
  private gyroOffsetX: number = 0;
  private gyroOffsetY: number = 0;
  private originalSceneData: Scene | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.resizeHandler = () => this.onWindowResize();
    this.initializeApp();
  }

  /**
   * Initialize PixiJS application asynchronously
   */
  private async initializeApp(): Promise<void> {
    try {
      this.container.innerHTML = '';

      // Calculate square canvas size
      const containerWidth = this.container.clientWidth || 400;
      const containerHeight = this.container.clientHeight || 400;
      const size = Math.min(containerWidth, containerHeight);

      const app = new PIXI.Application();
      await app.init({
        width: size,
        height: size,
        backgroundColor: 0x000000,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio,
      });

      this.container.appendChild(app.canvas);
      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.style.display = 'block';

      // Set this.app only after full initialisation so loadScene's readiness
      // check (while !this.app) correctly waits for the canvas to exist.
      this.app = app;
      window.addEventListener('resize', this.resizeHandler);
    } catch (error) {
      console.error('Failed to initialize PixiJS:', error);
    }
  }

  /**
   * Load and render a scene from JSON data
   */
  async loadScene(sceneData: Scene): Promise<void> {
    // Wait for app to initialize
    let attempts = 0;
    while (!this.app && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!this.app) {
      throw new Error('PixiJS application failed to initialize');
    }

    // Clear previous scene
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites = [];
    this.spriteMetadata.clear();
    this.selectionHighlight = null;
    this.selectedHighlightIndex = null;
    this.app.stage.removeChildren();

    // Load textures and create sprites
    for (const spriteData of sceneData.sprites) {
      await this.loadTexture(spriteData.textureResource);
      const sprite = await this.createSprite(spriteData);
      
      if (sprite) {
        this.sprites.push(sprite);
        this.spriteMetadata.set(sprite, {
          x: sprite.x,
          y: sprite.y,
          parallaxMultiplier: spriteData.parallaxMultiplier,
          name: spriteData.name,
          textureResource: spriteData.textureResource,
          visible: true,
          originalWidth: spriteData.width,
          originalHeight: spriteData.height,
        });
        this.app.stage.addChild(sprite);
      }
    }

    // Create phone guide if not already created
    if (!this.phoneGuide) {
      this.phoneGuide = new PhoneGuide();
      const guideGraphics = this.phoneGuide.createGraphics();
      this.app.stage.addChild(guideGraphics);
      guideGraphics.visible = this.showPhoneGuideFlag;
    }

    // Store original scene data for later serialization
    this.originalSceneData = sceneData;

    // Sort sprites by parallax so list and draw order are consistent
    this.sortSpritesByParallax();

    // Reset user zoom and fit scene to view
    this.userZoom = 1.0;
    this.fitSceneToView();
    this.setScrollOffset(sceneData.xFocus);
  }

  /**
   * Scale and position the scene to fit the canvas view
   * Centers the view around world x=0 (the room sprite)
   */
  // Default world-space extent used when the scene has no sprites (matches PhoneGuide WORLD_HEIGHT)
  private readonly DEFAULT_WORLD_SIZE = 10;

  private fitSceneToView(): void {
    if (!this.app) return;

    let sceneWidth: number;
    let sceneHeight: number;

    if (this.sprites.length === 0) {
      // No sprites yet — use the phone guide world dimensions so it renders at a sensible scale
      sceneWidth = this.DEFAULT_WORLD_SIZE;
      sceneHeight = this.DEFAULT_WORLD_SIZE;
    } else {
      // Calculate scene bounds (only for visible sprites)
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const sprite of this.sprites) {
        const metadata = this.spriteMetadata.get(sprite);
        if (!metadata || !metadata.visible) continue;

        const halfWidth = sprite.width / 2;
        const halfHeight = sprite.height / 2;

        minX = Math.min(minX, sprite.x - halfWidth);
        minY = Math.min(minY, sprite.y - halfHeight);
        maxX = Math.max(maxX, sprite.x + halfWidth);
        maxY = Math.max(maxY, sprite.y + halfHeight);
      }

      // Fallback to all sprites if none are visible
      if (minX === Infinity) {
        for (const sprite of this.sprites) {
          const halfWidth = sprite.width / 2;
          const halfHeight = sprite.height / 2;

          minX = Math.min(minX, sprite.x - halfWidth);
          minY = Math.min(minY, sprite.y - halfHeight);
          maxX = Math.max(maxX, sprite.x + halfWidth);
          maxY = Math.max(maxY, sprite.y + halfHeight);
        }
      }

      // Pad outward and clamp to at least the default world size so Center never
      // over-zooms on sparse scenes (e.g. a single small sprite in a new scene).
      const padding = 0.1;
      sceneWidth = Math.max(maxX - minX + 2 * padding, this.DEFAULT_WORLD_SIZE);
      sceneHeight = Math.max(maxY - minY + 2 * padding, this.DEFAULT_WORLD_SIZE);
    }
    const canvasWidth = this.app.canvas.width;
    const canvasHeight = this.app.canvas.height;

    // Fit the scene exactly into the canvas (no extra zoom multiplier).
    // ZOOM_SCALE was previously applied here, causing content to be 1.6× larger
    // than the canvas — clipping the phone guide and over-zooming sparse scenes.
    const scale = Math.min(canvasWidth / sceneWidth, canvasHeight / sceneHeight);
    const effectiveScale = scale * this.userZoom;

    // Position stage with world origin (0,0) centered on canvas
    this.app.stage.scale.set(effectiveScale, effectiveScale);
    this.app.stage.x = canvasWidth / 2;
    this.app.stage.y = canvasHeight / 2;
    this.baseStageX = canvasWidth / 2;
    this.baseStageY = canvasHeight / 2;
  }

  /**
   * Load a texture image from the public folder.
   * If resourceName already has an image extension, it is used as-is;
   * otherwise .png is appended for backwards compatibility.
   */
  private async loadTexture(resourceName: string): Promise<void> {
    if (this.textures.has(resourceName)) return;

    try {
      const hasExtension = /\.(png|jpg|jpeg|gif|webp)$/i.test(resourceName);
      const url = hasExtension ? `/images/${resourceName}` : `/images/${resourceName}.png`;
      const texture = await PIXI.Assets.load(url);
      this.textures.set(resourceName, texture);
    } catch (error) {
      console.error(`Failed to load texture: ${resourceName}`, error);
    }
  }

  /**
   * Add a new sprite to the scene using an image filename from the public/images folder.
   * @param textureResource filename (with or without extension) of the image
   * @param width world-space width
   * @param height world-space height
   * @param parallaxMultiplier depth / parallax value
   * @returns the index of the newly added sprite after sorting, or -1 on failure
   */
  async addSprite(textureResource: string, width: number, height: number, parallaxMultiplier: number): Promise<number> {
    if (!this.app) return -1;

    await this.loadTexture(textureResource);

    const baseName = textureResource.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
    const existingNames = new Set(this.sprites.map(s => this.spriteMetadata.get(s)?.name ?? ''));
    let name = baseName;
    let counter = 1;
    while (existingNames.has(name)) {
      name = `${baseName}_${counter++}`;
    }

    const spriteData: Sprite = {
      name,
      textureResource,
      textureResourceId: this.sprites.length,
      positionX: 0,
      positionY: 0,
      width,
      height,
      parallaxMultiplier,
      texCoordinates: [0, 0, 0, 1, 1, 0, 1, 1],
    };

    const pixiSprite = await this.createSprite(spriteData);
    if (!pixiSprite) return -1;

    this.sprites.push(pixiSprite);
    this.spriteMetadata.set(pixiSprite, {
      x: 0,
      y: 0,
      parallaxMultiplier,
      name,
      textureResource,
      visible: true,
      originalWidth: width,
      originalHeight: height,
    });
    this.app.stage.addChild(pixiSprite);

    if (this.originalSceneData) {
      this.originalSceneData.sprites.push(spriteData);
    }

    const newIndex = this.sortSpritesByParallax(this.sprites.length - 1);
    this.setScrollOffset(this.currentXFocus);

    return newIndex;
  }

  /**
   * Create a PixiJS sprite from sprite data with UV texture mapping
   */
  private async createSprite(spriteData: Sprite): Promise<PIXI.Sprite | null> {
    let texture = this.textures.get(spriteData.textureResource);
    if (!texture) {
      console.warn(`Texture not found: ${spriteData.textureResource}`);
      return null;
    }

    // Apply texture coordinates (UV mapping)
    if (spriteData.texCoordinates?.length === 8) {
      const [u0, v0, u1, v1, u2, v2, u3, v3] = spriteData.texCoordinates;
      const uValues = [u0, u1, u2, u3];
      const vValues = [v0, v1, v2, v3];

      const minU = Math.min(...uValues);
      const maxU = Math.max(...uValues);
      const minV = Math.min(...vValues);
      const maxV = Math.max(...vValues);

      const frame = new PIXI.Rectangle(
        minU * texture.width,
        minV * texture.height,
        (maxU - minU) * texture.width,
        (maxV - minV) * texture.height
      );

      texture = new PIXI.Texture({
        source: texture.source,
        frame,
      });
    }

    const sprite = new PIXI.Sprite(texture);
    sprite.x = spriteData.positionX;
    sprite.y = spriteData.positionY;
    sprite.width = spriteData.width;
    sprite.height = spriteData.height;
    sprite.anchor.set(0.5, 0.5);

    return sprite;
  }

  /**
   * Update sprite positions based on xFocus parallax value
   * @param xFocus Camera focus in [0..1] where 0.5 is center
   */
  setScrollOffset(xFocus: number): void {
    this.currentXFocus = xFocus;
    this.applyAllPositions();
  }

  private applyAllPositions(): void {
    const SCROLL_SCALE = 5.0;
    const scrollOffset = (0.5 - this.currentXFocus) * SCROLL_SCALE;

    for (const sprite of this.sprites) {
      const metadata = this.spriteMetadata.get(sprite);
      if (metadata) {
        sprite.x = metadata.x + (scrollOffset + this.gyroOffsetX) * metadata.parallaxMultiplier;
        sprite.y = metadata.y + this.gyroOffsetY * metadata.parallaxMultiplier;
      }
    }

    this.updateSelectionHighlight();
  }

  setSpriteSize(index: number, width: number, height: number): void {
    if (index >= 0 && index < this.sprites.length) {
      const sprite = this.sprites[index];
      sprite.width = width;
      sprite.height = height;
      this.setScrollOffset(this.currentXFocus);
      this.updateSelectionHighlight();
    }
  }

  getSpriteScale(index: number): { scale: number; width: number; height: number } | null {
    if (index >= 0 && index < this.sprites.length) {
      const sprite = this.sprites[index];
      const metadata = this.spriteMetadata.get(sprite);
      if (metadata) {
        const scale = metadata.originalWidth > 0 ? sprite.width / metadata.originalWidth : 1;
        return { scale, width: sprite.width, height: sprite.height };
      }
    }
    return null;
  }

  getSpritePosition(index: number): { x: number; y: number } | null {
    if (index >= 0 && index < this.sprites.length) {
      const sprite = this.sprites[index];
      const metadata = this.spriteMetadata.get(sprite);
      if (metadata) {
        return { x: metadata.x, y: metadata.y };
      }
    }
    return null;
  }

  setSpritePosition(index: number, x: number, y: number): void {
    if (index >= 0 && index < this.sprites.length) {
      const sprite = this.sprites[index];
      const metadata = this.spriteMetadata.get(sprite);
      if (metadata) {
        metadata.x = x;
        metadata.y = y;
        this.applyAllPositions();
      }
    }
  }

  setSelectedSpriteHighlight(index: number | null): void {
    this.selectedHighlightIndex = index;
    this.updateSelectionHighlight();
  }

  private updateSelectionHighlight(): void {
    if (!this.app) return;

    if (!this.selectionHighlight) {
      this.selectionHighlight = new PIXI.Graphics();
      this.app.stage.addChild(this.selectionHighlight);
    }

    this.selectionHighlight.clear();

    const index = this.selectedHighlightIndex;
    if (index === null || index < 0 || index >= this.sprites.length) return;

    const sprite = this.sprites[index];
    const lineWidth = 0.01;
    const left = sprite.x - sprite.width / 2;
    const top = sprite.y - sprite.height / 2;

    this.selectionHighlight
      .moveTo(left, top)
      .lineTo(left + sprite.width, top)
      .lineTo(left + sprite.width, top + sprite.height)
      .lineTo(left, top + sprite.height)
      .lineTo(left, top)
      .stroke({ color: 0x00ff00, width: lineWidth, alpha: 1.0 });
  }

  /**
   * Toggle phone guide visibility
   */
  togglePhoneGuide(): void {
    this.showPhoneGuideFlag = !this.showPhoneGuideFlag;
    if (this.phoneGuide) {
      const graphics = this.phoneGuide.getGraphics();
      if (graphics) {
        graphics.visible = this.showPhoneGuideFlag;
      }
    }
  }

  /**
   * Show the phone guide
   */
  showGuide(): void {
    this.showPhoneGuideFlag = true;
    if (this.phoneGuide) {
      const graphics = this.phoneGuide.getGraphics();
      if (graphics) {
        graphics.visible = true;
      }
    }
  }

  /**
   * Hide the phone guide
   */
  hideGuide(): void {
    this.showPhoneGuideFlag = false;
    if (this.phoneGuide) {
      const graphics = this.phoneGuide.getGraphics();
      if (graphics) {
        graphics.visible = false;
      }
    }
  }

  /**
   * Check if phone guide is visible
   */
  isGuideVisible(): boolean {
    return this.showPhoneGuideFlag;
  }

  getSpriteEntries(): SpriteEntry[] {
    return this.sprites.map((sprite, index) => {
      const metadata = this.spriteMetadata.get(sprite);
      return { name: metadata?.name || `Sprite ${index}`, visible: metadata?.visible ?? true, parallaxMultiplier: metadata?.parallaxMultiplier ?? 1.0 };
    });
  }

  getSpriteParallax(index: number): number | null {
    if (index >= 0 && index < this.sprites.length) {
      const metadata = this.spriteMetadata.get(this.sprites[index]);
      if (metadata) return metadata.parallaxMultiplier;
    }
    return null;
  }

  setSpriteParallax(index: number, value: number): void {
    if (index >= 0 && index < this.sprites.length) {
      const metadata = this.spriteMetadata.get(this.sprites[index]);
      if (metadata) {
        metadata.parallaxMultiplier = value;
        this.setScrollOffset(this.currentXFocus);
      }
    }
  }

  /**
   * Return texture editing data for a sprite: current tex coords, texture resource, and dimensions.
   */
  getSpriteTexData(index: number): {
    texCoordinates: number[];
    textureResource: string;
    width: number;
    height: number;
  } | null {
    if (index < 0 || index >= this.sprites.length) return null;
    const sprite = this.sprites[index];
    const metadata = this.spriteMetadata.get(sprite);
    if (!metadata) return null;

    const original = this.originalSceneData?.sprites.find(s => s.name === metadata.name);
    return {
      texCoordinates: original?.texCoordinates ? [...original.texCoordinates] : [0, 1, 0, 0, 1, 1, 1, 0],
      textureResource: metadata.textureResource,
      width: sprite.width,
      height: sprite.height,
    };
  }

  /**
   * Apply new texture coordinates, width, and height to a sprite (from the texture editor).
   * Updates the PIXI sprite's texture frame and dimensions, and syncs originalSceneData.
   */
  applyTexture(index: number, texCoords: number[], width: number, height: number): void {
    if (index < 0 || index >= this.sprites.length) return;
    const sprite = this.sprites[index];
    const metadata = this.spriteMetadata.get(sprite);
    if (!metadata) return;

    const baseTexture = this.textures.get(metadata.textureResource);
    if (baseTexture) {
      const uValues = [texCoords[0], texCoords[2], texCoords[4], texCoords[6]];
      const vValues = [texCoords[1], texCoords[3], texCoords[5], texCoords[7]];
      const minU = Math.min(...uValues);
      const maxU = Math.max(...uValues);
      const minV = Math.min(...vValues);
      const maxV = Math.max(...vValues);

      sprite.texture = new PIXI.Texture({
        source: baseTexture.source,
        frame: new PIXI.Rectangle(
          minU * baseTexture.width,
          minV * baseTexture.height,
          (maxU - minU) * baseTexture.width,
          (maxV - minV) * baseTexture.height,
        ),
      });
    }

    sprite.width = width;
    sprite.height = height;

    // Sync originalSceneData
    const original = this.originalSceneData?.sprites.find(s => s.name === metadata.name);
    if (original) {
      original.texCoordinates = texCoords;
      original.width = width;
      original.height = height;
    }

    this.setScrollOffset(this.currentXFocus);
    this.updateSelectionHighlight();
  }

  /**
   * Sort sprites by parallaxMultiplier ascending (furthest back first),
   * with alphabetical name as tiebreaker.
   * Updates the selection highlight index to track the selected sprite.
   * @param trackedIndex optional index to track through the sort; returns its new index
   */
  sortSpritesByParallax(trackedIndex?: number): number {
    const trackedSprite = trackedIndex !== undefined && trackedIndex >= 0 && trackedIndex < this.sprites.length
      ? this.sprites[trackedIndex]
      : null;
    const selectedSprite = this.selectedHighlightIndex !== null && this.selectedHighlightIndex < this.sprites.length
      ? this.sprites[this.selectedHighlightIndex]
      : null;

    this.sprites.sort((a, b) => {
      const ma = this.spriteMetadata.get(a)!;
      const mb = this.spriteMetadata.get(b)!;
      if (ma.parallaxMultiplier !== mb.parallaxMultiplier) {
        return ma.parallaxMultiplier - mb.parallaxMultiplier;
      }
      return ma.name.localeCompare(mb.name);
    });

    // Re-add children in new order so draw order matches
    if (this.app) {
      for (const sprite of this.sprites) {
        this.app.stage.addChild(sprite);
      }
      // Keep phone guide and selection highlight on top
      if (this.phoneGuide) {
        const g = this.phoneGuide.getGraphics();
        if (g) this.app.stage.addChild(g);
      }
      if (this.selectionHighlight) this.app.stage.addChild(this.selectionHighlight);
    }

    if (selectedSprite) {
      this.selectedHighlightIndex = this.sprites.indexOf(selectedSprite);
      this.updateSelectionHighlight();
    }

    return trackedSprite ? this.sprites.indexOf(trackedSprite) : 0;
  }

  getSceneData(): Scene | null {
    if (!this.originalSceneData) return null;
    const originalByName = new Map(this.originalSceneData.sprites.map(s => [s.name, s]));
    return {
      ...this.originalSceneData,
      xFocus: this.currentXFocus,
      sprites: this.sprites.map((sprite) => {
        const metadata = this.spriteMetadata.get(sprite);
        const original = originalByName.get(metadata?.name ?? '') ?? this.originalSceneData!.sprites[0];
        return {
          ...original,
          positionX: metadata?.x ?? original.positionX,
          positionY: metadata?.y ?? original.positionY,
          width: sprite.width,
          height: sprite.height,
          parallaxMultiplier: metadata?.parallaxMultiplier ?? original.parallaxMultiplier,
        };
      }),
    };
  }

  toggleSpriteByIndex(index: number): void {
    if (index >= 0 && index < this.sprites.length) {
      this.toggleSpriteVisibility(this.sprites[index]);
    }
  }

  removeSpriteByIndex(index: number): void {
    if (index < 0 || index >= this.sprites.length) return;

    const sprite = this.sprites[index];
    const metadata = this.spriteMetadata.get(sprite);

    // Remove from stage and clean up
    sprite.destroy();
    this.sprites.splice(index, 1);
    this.spriteMetadata.delete(sprite);

    // Remove from originalSceneData by name so getSceneData() stays in sync
    if (this.originalSceneData && metadata) {
      const nameToRemove = metadata.name;
      const dataIndex = this.originalSceneData.sprites.findIndex(s => s.name === nameToRemove);
      if (dataIndex !== -1) {
        this.originalSceneData.sprites.splice(dataIndex, 1);
      }
    }

    // Fix up selection highlight
    if (this.selectedHighlightIndex === index) {
      this.selectedHighlightIndex = null;
    } else if (this.selectedHighlightIndex !== null && this.selectedHighlightIndex > index) {
      this.selectedHighlightIndex--;
    }
    this.updateSelectionHighlight();
  }

  private toggleSpriteVisibility(sprite: PIXI.Sprite): void {
    const metadata = this.spriteMetadata.get(sprite);
    if (metadata) {
      metadata.visible = !metadata.visible;
      sprite.visible = metadata.visible;
    }
  }

  /**
   * Set visibility of a sprite by index
   */
  setSpriteVisibility(index: number, visible: boolean): void {
    if (index >= 0 && index < this.sprites.length) {
      const metadata = this.spriteMetadata.get(this.sprites[index]);
      if (metadata && metadata.visible !== visible) {
        this.toggleSpriteVisibility(this.sprites[index]);
      }
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.app ? (this.app.canvas as HTMLCanvasElement) : null;
  }

  private static readonly MIN_ZOOM = 1.0;
  private static readonly MAX_ZOOM = 8.0;

  private applyZoomPivot(cssX: number, cssY: number, scaleFactor: number): void {
    if (!this.app) return;
    const dpr = window.devicePixelRatio || 1;
    const pivotX = cssX * dpr;
    const pivotY = cssY * dpr;
    this.app.stage.x = pivotX + (this.app.stage.x - pivotX) * scaleFactor;
    this.app.stage.y = pivotY + (this.app.stage.y - pivotY) * scaleFactor;
    this.app.stage.scale.set(this.app.stage.scale.x * scaleFactor);
  }

  /**
   * Zoom toward a CSS-pixel point on the canvas (e.g. mouse cursor position).
   * Zooming out past 100% snaps back to the original fitted position.
   * @param cssX x position in CSS pixels relative to the canvas element
   * @param cssY y position in CSS pixels relative to the canvas element
   * @param factor multiplicative zoom factor (>1 to zoom in, <1 to zoom out)
   */
  zoomAt(cssX: number, cssY: number, factor: number): void {
    if (!this.app) return;

    const newUserZoom = Math.max(SceneRenderer.MIN_ZOOM, Math.min(SceneRenderer.MAX_ZOOM, this.userZoom * factor));
    if (newUserZoom === this.userZoom) return;

    const scaleFactor = newUserZoom / this.userZoom;
    this.userZoom = newUserZoom;
    this.applyZoomPivot(cssX, cssY, scaleFactor);
  }

  /**
   * Zoom toward the center of the canvas.
   * Zooming out past 100% snaps back to the original fitted position.
   * @param factor multiplicative zoom factor (>1 to zoom in, <1 to zoom out)
   */
  zoomAtCenter(factor: number): void {
    if (!this.app) return;

    const newUserZoom = Math.max(SceneRenderer.MIN_ZOOM, Math.min(SceneRenderer.MAX_ZOOM, this.userZoom * factor));
    if (newUserZoom === this.userZoom) return;

    // Use the stored base stage position (physical pixels) as the pivot so that
    // zoom-out always converges back toward the perfectly-centered 100% view,
    // regardless of any panning or previous zoom-in direction.
    const dpr = window.devicePixelRatio || 1;
    const scaleFactor = newUserZoom / this.userZoom;
    this.userZoom = newUserZoom;
    this.applyZoomPivot(this.baseStageX / dpr, this.baseStageY / dpr, scaleFactor);
  }

  /**
   * Reset zoom to 100% and re-center the view.
   */
  resetView(): void {
    this.userZoom = 1.0;
    this.fitSceneToView();
  }

  getZoom(): number {
    return this.userZoom;
  }

  /**
   * Set gyroscope simulation offsets in world units (clamped to ±0.5).
   * gyroX maps to left/right tilt, gyroY to forward/back tilt.
   */
  setGyroOffset(x: number, y: number): void {
    this.gyroOffsetX = Math.max(-0.5, Math.min(0.5, x));
    this.gyroOffsetY = Math.max(-0.5, Math.min(0.5, y));
    this.applyAllPositions();
  }

  clearGyroOffset(): void {
    this.gyroOffsetX = 0;
    this.gyroOffsetY = 0;
    this.applyAllPositions();
  }

  /**
   * Pan the stage by a delta in CSS pixels.
   */
  panBy(cssDeltaX: number, cssDeltaY: number): void {
    if (!this.app) return;
    const dpr = window.devicePixelRatio || 1;
    this.app.stage.x += cssDeltaX * dpr;
    this.app.stage.y += cssDeltaY * dpr;
  }

  /**
   * Convert CSS-pixel coordinates (relative to the canvas element) to world coordinates.
   * With autoDensity + resolution:dpr, canvas.width is physical pixels, so we multiply by dpr.
   */
  canvasToWorld(cssX: number, cssY: number): { x: number; y: number } {
    if (!this.app) return { x: 0, y: 0 };
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (cssX * dpr - this.app.stage.x) / this.app.stage.scale.x,
      y: (cssY * dpr - this.app.stage.y) / this.app.stage.scale.y,
    };
  }

  /**
   * Returns true if the CSS-pixel point (relative to the canvas element) is within the
   * rendered bounds of the sprite at the given index.
   */
  hitTestSprite(index: number, cssX: number, cssY: number): boolean {
    if (!this.app || index < 0 || index >= this.sprites.length) return false;
    const world = this.canvasToWorld(cssX, cssY);
    const sprite = this.sprites[index];
    return (
      world.x >= sprite.x - sprite.width / 2 &&
      world.x <= sprite.x + sprite.width / 2 &&
      world.y >= sprite.y - sprite.height / 2 &&
      world.y <= sprite.y + sprite.height / 2
    );
  }

  /**
   * Get visibility state of all sprites
   */
  getSpriteVisibilityStates(): boolean[] {
    return this.sprites.map(sprite => {
      const metadata = this.spriteMetadata.get(sprite);
      return metadata?.visible ?? true;
    });
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    if (!this.app) return;

    const containerWidth = this.container.clientWidth || 400;
    const containerHeight = this.container.clientHeight || 400;
    const size = Math.min(containerWidth, containerHeight);

    this.app.renderer.resize(size, size);
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    this.fitSceneToView();
  }

  /**
   * Destroy the renderer and clean up resources
   */
  destroy(): void {
    try {
      window.removeEventListener('resize', this.resizeHandler);

      if (this.app) {
        this.app.stage.removeChildren();
        this.sprites = [];
        this.spriteMetadata.clear();
      }

      if (this.phoneGuide) {
        this.phoneGuide.destroy();
        this.phoneGuide = null;
      }
    } catch (error) {
      console.error('Error destroying renderer:', error);
    }
  }
}
