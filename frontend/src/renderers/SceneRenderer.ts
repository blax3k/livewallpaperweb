import * as PIXI from 'pixi.js';
import { Scene, Sprite } from '../interfaces/Scene';
import { PhoneGuide } from './PhoneGuide';
import type { SpriteEntry } from '../controls/panels/SpriteListPanel';
import type { SpriteConditionBlock, SpriteModification, RuleConditionGroup } from '@livewallpaper/types';

interface SpriteMetadata {
  id?: string;
  x: number;
  y: number;
  parallaxMultiplier: number;
  name: string;
  textureResource: string;
  visible: boolean;
  originalWidth: number;
  originalHeight: number;
  // Preserved values while gyro scaling is active
  preGyroX?: number;
  preGyroY?: number;
  preGyroWidth?: number;
  preGyroHeight?: number;
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
  private currentStartTime: number = 0;
  private currentEndTime: number = 1439;
  private selectionHighlight: PIXI.Graphics | null = null;
  private selectedHighlightIndex: number | null = null;
  private readonly ZOOM_SCALE = 1.6;
  private userZoom: number = 1.0;
  private baseStageX: number = 0;
  private baseStageY: number = 0;
  private gyroOffsetX: number = 0;
  private gyroOffsetY: number = 0;
  private isGyroScaled: boolean = false;
  private originalSceneData: Scene | null = null;

  // Keyed by PIXI sprite object — stores the sprite's true base values for as long as it has
  // at least one condition set selected (see selectedConditionBlockBySprite below).
  private conditionPreviewState: Map<PIXI.Sprite, {
    baseX: number; baseY: number; baseParallax: number; baseWidth: number; baseHeight: number;
    baseTexCoordinates: number[];
  }> = new Map();
  // Every sprite that has condition sets always has exactly one selected — there is no
  // "base mode" for such a sprite, independent of which sprite is focused for editing.
  // Stores the block object itself (not an index) so removing/reordering other conditions
  // never invalidates it.
  private selectedConditionBlockBySprite: Map<PIXI.Sprite, SpriteConditionBlock> = new Map();
  // Sprites explicitly showing their base (Default) state — distinct from the uninitialized case.
  private selectedDefaultBySprite: Set<PIXI.Sprite> = new Set();

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
        preserveDrawingBuffer: true,
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
    this.conditionPreviewState.clear();
    this.selectedConditionBlockBySprite.clear();
    this.selectedDefaultBySprite.clear();
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
          id: spriteData.id,
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
    this.currentStartTime = sceneData.startTime ?? 0;
    this.currentEndTime = sceneData.endTime ?? 1439;

    // Any sprite with condition sets always has one selected — never an ambiguous "none
    // active" state, regardless of which sprite (if any) ends up focused for editing.
    this.sprites.forEach((_, i) => {
      if ((this.getOriginalSpriteData(i)?.conditions?.length ?? 0) > 0) {
        this.selectCondition(i, 0);
      }
    });

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

    const canvasWidth = this.app.canvas.width;
    const canvasHeight = this.app.canvas.height;

    // Always frame the fixed 10-unit world — this matches Android where the viewport is
    // always the phone screen regardless of how far sprites extend. The phone guide
    // (GUIDE_HEIGHT=9.99) will consistently fill the top/bottom edges of the canvas.
    const scale = Math.min(canvasWidth / this.DEFAULT_WORLD_SIZE, canvasHeight / this.DEFAULT_WORLD_SIZE);
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
      let url: string;
      if (resourceName.startsWith('/')) {
        // Already a full path (e.g. uploaded image at /uploads/...)
        url = resourceName;
      } else {
        const hasExtension = /\.(png|jpg|jpeg|gif|webp)$/i.test(resourceName);
        url = hasExtension ? `/images/${resourceName}` : `/images/${resourceName}.png`;
      }
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

    const baseName = 'sprite';
    const existingNames = new Set(this.sprites.map(s => this.spriteMetadata.get(s)?.name ?? ''));
    let counter = existingNames.size + 1;
    let name = `${baseName}_${counter++}`;
    while (existingNames.has(name)) {
      name = `${baseName}_${counter++}`;
    }

    const spriteData: Sprite = {
      name,
      textureResource,
      positionX: 0,
      positionY: 0,
      width,
      height,
      parallaxMultiplier,
      texCoordinates: [0, 1, 0, 0, 1, 1, 1, 0],
    };
    console.log('[addSprite] spriteData.texCoordinates:', JSON.stringify(spriteData.texCoordinates));

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
   * Build a texture cropped to the given UV quad (8 floats: 4 corners) from a base texture.
   */
  private cropTexture(baseTexture: PIXI.Texture, texCoords: number[]): PIXI.Texture {
    const uValues = [texCoords[0], texCoords[2], texCoords[4], texCoords[6]];
    const vValues = [texCoords[1], texCoords[3], texCoords[5], texCoords[7]];
    const minU = Math.min(...uValues);
    const maxU = Math.max(...uValues);
    const minV = Math.min(...vValues);
    const maxV = Math.max(...vValues);

    return new PIXI.Texture({
      source: baseTexture.source,
      frame: new PIXI.Rectangle(
        minU * baseTexture.width,
        minV * baseTexture.height,
        (maxU - minU) * baseTexture.width,
        (maxV - minV) * baseTexture.height,
      ),
    });
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
      texture = this.cropTexture(texture, spriteData.texCoordinates);
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

  setStartTime(value: number): void {
    this.currentStartTime = value;
  }

  setEndTime(value: number): void {
    this.currentEndTime = value;
  }

  private applyAllPositions(): void {
    const SCROLL_SCALE = 5.0;
    const scrollOffset = (0.5 - this.currentXFocus) * SCROLL_SCALE;

    for (const sprite of this.sprites) {
      const metadata = this.spriteMetadata.get(sprite);
      if (metadata) {
        sprite.x = metadata.x + (scrollOffset + this.gyroOffsetX) * metadata.parallaxMultiplier;
        sprite.y = -metadata.y + this.gyroOffsetY * metadata.parallaxMultiplier;
      }
    }

    this.updateSelectionHighlight();
  }

  setSpriteSize(index: number, width: number, height: number): void {
    if (index < 0 || index >= this.sprites.length) return;
    const sprite = this.sprites[index];
    const block = this.selectedConditionBlockBySprite.get(sprite);
    if (block) {
      this.setBlockSizeMod(block, index, width, height);
      return;
    }
    sprite.width = width;
    sprite.height = height;
    this.setScrollOffset(this.currentXFocus);
    this.updateSelectionHighlight();
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
    if (index < 0 || index >= this.sprites.length) return;
    const sprite = this.sprites[index];
    const block = this.selectedConditionBlockBySprite.get(sprite);
    if (block) {
      this.setBlockPositionMod(block, index, x, y);
      return;
    }
    const metadata = this.spriteMetadata.get(sprite);
    if (metadata) {
      metadata.x = x;
      metadata.y = y;
      this.applyAllPositions();
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
      return { id: metadata?.id, name: metadata?.name || `Sprite ${index}`, visible: metadata?.visible ?? true, parallaxMultiplier: metadata?.parallaxMultiplier ?? 1.0 };
    });
  }

  getSpriteParallax(index: number): number | null {
    if (index >= 0 && index < this.sprites.length) {
      const metadata = this.spriteMetadata.get(this.sprites[index]);
      if (metadata) return metadata.parallaxMultiplier;
    }
    return null;
  }

  renameSpriteByIndex(index: number, newName: string): void {
    if (index >= 0 && index < this.sprites.length) {
      const metadata = this.spriteMetadata.get(this.sprites[index]);
      if (metadata) {
        if (this.originalSceneData) {
          const entry = this.originalSceneData.sprites.find(s => s.name === metadata.name);
          if (entry){
            
            entry.name = newName;
          }
        }
        metadata.name = newName;
      }
    }
  }

  setSpriteParallax(index: number, value: number): void {
    if (index < 0 || index >= this.sprites.length) return;
    const block = this.selectedConditionBlockBySprite.get(this.sprites[index]);
    if (block) {
      this.setBlockParallaxMod(block, index, value);
      return;
    }
    const metadata = this.spriteMetadata.get(this.sprites[index]);
    if (metadata) {
      metadata.parallaxMultiplier = value;
      this.setScrollOffset(this.currentXFocus);
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
    let texCoordinates = original?.texCoordinates ? [...original.texCoordinates] : [0, 1, 0, 0, 1, 1, 1, 0];
    const block = this.selectedConditionBlockBySprite.get(sprite);
    if (block) {
      const mod = block.modifications.find(m => m.type === 'texture_coordinates');
      if (mod?.texCoordinates) texCoordinates = [...mod.texCoordinates];
    }
    return {
      texCoordinates,
      textureResource: metadata.textureResource,
      width: sprite.width,
      height: sprite.height,
    };
  }

  /**
   * Apply new texture coordinates, width, and height to a sprite (from the texture editor).
   * While a condition set is being previewed, this is stored as an override on that condition
   * (matching how position/parallax/size already behave) instead of mutating the base sprite.
   * Updates the PIXI sprite's texture frame and dimensions, and syncs originalSceneData.
   */
  applyTexture(index: number, texCoords: number[], width: number, height: number): void {
    if (index < 0 || index >= this.sprites.length) return;
    const sprite = this.sprites[index];
    const metadata = this.spriteMetadata.get(sprite);
    if (!metadata) return;

    const block = this.selectedConditionBlockBySprite.get(sprite);
    if (block) {
      this.setBlockTexCoordMod(block, index, texCoords);
      this.setBlockSizeMod(block, index, width, height);
      return;
    }

    const baseTexture = this.textures.get(metadata.textureResource);
    if (baseTexture) {
      sprite.texture = this.cropTexture(baseTexture, texCoords);
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

  getSpriteTextureResource(index: number): string | null {
    if (index >= 0 && index < this.sprites.length) {
      const metadata = this.spriteMetadata.get(this.sprites[index]);
      if (metadata) return metadata.textureResource;
    }
    return null;
  }

  getSpriteTexCoordinates(index: number): number[] | null {
    if (index >= 0 && index < this.sprites.length) {
      const sprite = this.sprites[index];
      const metadata = this.spriteMetadata.get(sprite);
      if (!metadata) return null;
      const original = this.originalSceneData?.sprites.find(s => s.name === metadata.name);
      return original?.texCoordinates ?? null;
    }
    return null;
  }

  /**
   * Swap the texture of an existing sprite without changing its position or dimensions.
   * Resets tex coordinates to the full texture (no UV crop) unless texCoords is provided.
   * If forceSize is provided, uses those exact dimensions instead of computing from aspect ratio.
   */
  async changeTexture(index: number, textureResource: string, forceSize?: { width: number; height: number }, texCoords?: number[]): Promise<void> {
    if (index < 0 || index >= this.sprites.length) return;
    const sprite = this.sprites[index];
    const metadata = this.spriteMetadata.get(sprite);
    if (!metadata) return;

    await this.loadTexture(textureResource);
    const newTexture = this.textures.get(textureResource);
    if (!newTexture) return;

    // Preserve world-space width; adjust height to match the new texture's aspect ratio.
    // forceSize overrides this for exact undo/redo restoration.
    const currentWidth = forceSize?.width ?? sprite.width;
    const newHeight = forceSize?.height ?? (newTexture.width > 0 ? currentWidth * newTexture.height / newTexture.width : sprite.height);

    // Apply texture — use provided texCoords for a cropped frame, otherwise use the full texture
    if (texCoords && texCoords.length === 8) {
      const uValues = [texCoords[0], texCoords[2], texCoords[4], texCoords[6]];
      const vValues = [texCoords[1], texCoords[3], texCoords[5], texCoords[7]];
      const minU = Math.min(...uValues);
      const maxU = Math.max(...uValues);
      const minV = Math.min(...vValues);
      const maxV = Math.max(...vValues);
      sprite.texture = new PIXI.Texture({
        source: newTexture.source,
        frame: new PIXI.Rectangle(
          minU * newTexture.width,
          minV * newTexture.height,
          (maxU - minU) * newTexture.width,
          (maxV - minV) * newTexture.height,
        ),
      });
    } else {
      sprite.texture = newTexture;
    }
    sprite.width = currentWidth;
    sprite.height = newHeight;
    metadata.textureResource = textureResource;
    metadata.originalWidth = currentWidth;
    metadata.originalHeight = newHeight;

    const storedTexCoords = texCoords ?? [0, 1, 0, 0, 1, 1, 1, 0];
    console.log('[changeTexture] texCoords arg:', JSON.stringify(texCoords), '=> stored:', JSON.stringify(storedTexCoords));
    const original = this.originalSceneData?.sprites.find(s => s.name === metadata.name);
    if (original) {
      original.textureResource = textureResource;
      original.texCoordinates = storedTexCoords;
      original.width = currentWidth;
      original.height = newHeight;
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
    console.log('[getSceneData] originalSceneData sprites texCoords:', JSON.stringify(this.originalSceneData.sprites.map(s => ({ name: s.name, texCoordinates: s.texCoordinates }))));
    return {
      ...this.originalSceneData,
      xFocus: this.currentXFocus,
      startTime: this.currentStartTime,
      endTime: this.currentEndTime,
      sprites: this.sprites.map((sprite) => {
        const metadata = this.spriteMetadata.get(sprite);
        const original = originalByName.get(metadata?.name ?? '') ?? this.originalSceneData!.sprites[0];
        const preview = this.conditionPreviewState.get(sprite);
        return {
          ...original,
          positionX: preview ? preview.baseX : (metadata?.x ?? original.positionX),
          positionY: preview ? preview.baseY : (metadata?.y ?? original.positionY),
          width: preview ? preview.baseWidth : sprite.width,
          height: preview ? preview.baseHeight : sprite.height,
          parallaxMultiplier: preview ? preview.baseParallax : (metadata?.parallaxMultiplier ?? original.parallaxMultiplier),
          texCoordinates: preview ? preview.baseTexCoordinates : original.texCoordinates,
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

  getSpriteConditions(index: number): import('@livewallpaper/types').SpriteConditionBlock[] {
    if (!this.originalSceneData || index < 0 || index >= this.originalSceneData.sprites.length) return [];
    const sprite = this.sprites[index];
    const metadata = this.spriteMetadata.get(sprite);
    const original = this.originalSceneData.sprites.find(s => s.name === metadata?.name);
    return original?.conditions ? [...original.conditions] : [];
  }

  setSpriteConditions(index: number, conditions: SpriteConditionBlock[]): void {
    if (!this.originalSceneData) return;
    const sprite = this.sprites[index];
    const metadata = this.spriteMetadata.get(sprite);
    if (!metadata) return;
    const original = this.originalSceneData.sprites.find(s => s.name === metadata.name);
    if (original) {
      original.conditions = conditions.length > 0 ? conditions : undefined;
    }
  }

  // ── Condition preview ──────────────────────────────────────────────────────

  private getOriginalSpriteData(spriteIndex: number): Sprite | null {
    if (!this.originalSceneData || spriteIndex < 0 || spriteIndex >= this.sprites.length) return null;
    const metadata = this.spriteMetadata.get(this.sprites[spriteIndex]);
    return this.originalSceneData.sprites.find(s => s.name === metadata?.name) ?? null;
  }

  private applyConditionMods(spriteIndex: number, modifications: SpriteModification[]): void {
    const sprite = this.sprites[spriteIndex];
    const metadata = this.spriteMetadata.get(sprite);
    const preview = this.conditionPreviewState.get(sprite);
    if (!metadata || !preview) return;

    let x = preview.baseX, y = preview.baseY;
    let parallax = preview.baseParallax;
    let width = preview.baseWidth, height = preview.baseHeight;
    let texCoordinates = preview.baseTexCoordinates;

    for (const mod of modifications) {
      if (mod.type === 'position') {
        if (mod.positionX !== undefined) x = mod.positionX;
        if (mod.positionY !== undefined) y = mod.positionY;
      } else if (mod.type === 'parallax') {
        if (mod.parallaxMultiplier !== undefined) parallax = mod.parallaxMultiplier;
      } else if (mod.type === 'size') {
        if (mod.width !== undefined) width = mod.width;
        if (mod.height !== undefined) height = mod.height;
      } else if (mod.type === 'texture_coordinates') {
        if (mod.texCoordinates) texCoordinates = mod.texCoordinates;
      }
    }

    metadata.x = x; metadata.y = y;
    metadata.parallaxMultiplier = parallax;
    sprite.width = width; sprite.height = height;
    const baseTexture = this.textures.get(metadata.textureResource);
    if (baseTexture) sprite.texture = this.cropTexture(baseTexture, texCoordinates);
    this.applyAllPositions();
    this.updateSelectionHighlight();
  }

  /**
   * Select which condition set is currently shown for a sprite. Unlike the old "preview" model,
   * this is permanent (per sprite) rather than something that gets exited — a sprite with one or
   * more condition sets always has exactly one selected, regardless of which sprite is focused
   * for editing. Only a sprite with zero condition sets ever shows its plain base values.
   */
  selectCondition(spriteIndex: number, conditionIndex: number): void {
    if (spriteIndex < 0 || spriteIndex >= this.sprites.length) return;
    const sprite = this.sprites[spriteIndex];
    const metadata = this.spriteMetadata.get(sprite);
    const original = this.getOriginalSpriteData(spriteIndex);
    const block = original?.conditions?.[conditionIndex];
    if (!metadata || !block) return;

    const wasDefault = this.selectedDefaultBySprite.has(sprite);
    this.selectedDefaultBySprite.delete(sprite);

    if (!this.conditionPreviewState.has(sprite) || wasDefault) {
      // Capture the current values as the base on first selection or when returning from Default
      // (where the user may have edited position/size/parallax directly on the base sprite).
      this.conditionPreviewState.set(sprite, {
        baseX: metadata.x, baseY: metadata.y,
        baseParallax: metadata.parallaxMultiplier,
        baseWidth: sprite.width, baseHeight: sprite.height,
        baseTexCoordinates: original?.texCoordinates ?? [0, 1, 0, 0, 1, 1, 1, 0],
      });
    }

    this.selectedConditionBlockBySprite.set(sprite, block);
    this.applyConditionMods(spriteIndex, block.modifications);
  }

  /**
   * Switch a sprite to show its base (Default) values. Restores the visual to the base state
   * but keeps conditionPreviewState so switching back to a condition set can still apply its
   * modifications relative to the correct base. Edits made while Default is active go directly
   * to the base values (same path as sprites with no condition sets).
   */
  selectDefaultCondition(spriteIndex: number): void {
    if (spriteIndex < 0 || spriteIndex >= this.sprites.length) return;
    const sprite = this.sprites[spriteIndex];
    const metadata = this.spriteMetadata.get(sprite);
    if (!metadata) return;

    const saved = this.conditionPreviewState.get(sprite);
    if (saved) {
      metadata.x = saved.baseX; metadata.y = saved.baseY;
      metadata.parallaxMultiplier = saved.baseParallax;
      sprite.width = saved.baseWidth; sprite.height = saved.baseHeight;
      const baseTexture = this.textures.get(metadata.textureResource);
      if (baseTexture) sprite.texture = this.cropTexture(baseTexture, saved.baseTexCoordinates);
      this.applyAllPositions();
      this.updateSelectionHighlight();
    }

    this.selectedConditionBlockBySprite.delete(sprite);
    this.selectedDefaultBySprite.add(sprite);
  }

  /**
   * Returns the index of the currently selected condition set for a sprite, or null if it has
   * none selected (i.e. it has no condition sets at all, so its plain base values are shown).
   * Looked up by the block's identity rather than a stored index, so it stays correct even after
   * other condition sets on the same sprite are added, removed, or reordered.
   */
  getSelectedConditionIndex(spriteIndex: number): number | null {
    if (spriteIndex < 0 || spriteIndex >= this.sprites.length) return null;
    const sprite = this.sprites[spriteIndex];
    if (this.selectedDefaultBySprite.has(sprite)) return -1;
    const block = this.selectedConditionBlockBySprite.get(sprite);
    if (!block) return null;
    const original = this.getOriginalSpriteData(spriteIndex);
    const index = original?.conditions?.indexOf(block) ?? -1;
    return index >= 0 ? index : null;
  }

  /**
   * Restore a sprite to its plain base values and clear its condition selection. Only called
   * once a sprite's last condition set is removed — for as long as it has any, one stays selected.
   */
  private restoreSpriteToBase(spriteIndex: number): void {
    if (spriteIndex < 0 || spriteIndex >= this.sprites.length) return;
    const sprite = this.sprites[spriteIndex];
    const saved = this.conditionPreviewState.get(sprite);
    if (!saved) return;

    const metadata = this.spriteMetadata.get(sprite);
    if (metadata) {
      metadata.x = saved.baseX; metadata.y = saved.baseY;
      metadata.parallaxMultiplier = saved.baseParallax;
      const baseTexture = this.textures.get(metadata.textureResource);
      if (baseTexture) sprite.texture = this.cropTexture(baseTexture, saved.baseTexCoordinates);
    }
    sprite.width = saved.baseWidth; sprite.height = saved.baseHeight;
    this.conditionPreviewState.delete(sprite);
    this.selectedConditionBlockBySprite.delete(sprite);
    this.applyAllPositions();
    this.updateSelectionHighlight();
  }

  private setBlockPositionMod(block: SpriteConditionBlock, spriteIndex: number, x: number, y: number): void {
    const existing = block.modifications.find(m => m.type === 'position');
    if (existing) { existing.positionX = x; existing.positionY = y; }
    else block.modifications.push({ type: 'position', positionX: x, positionY: y });

    const metadata = this.spriteMetadata.get(this.sprites[spriteIndex]);
    if (metadata) { metadata.x = x; metadata.y = y; }
    this.applyAllPositions();
  }

  private setBlockParallaxMod(block: SpriteConditionBlock, spriteIndex: number, parallax: number): void {
    const existing = block.modifications.find(m => m.type === 'parallax');
    if (existing) { existing.parallaxMultiplier = parallax; }
    else block.modifications.push({ type: 'parallax', parallaxMultiplier: parallax });

    const metadata = this.spriteMetadata.get(this.sprites[spriteIndex]);
    if (metadata) { metadata.parallaxMultiplier = parallax; }
    this.applyAllPositions();
  }

  private setBlockSizeMod(block: SpriteConditionBlock, spriteIndex: number, width: number, height: number): void {
    const existing = block.modifications.find(m => m.type === 'size');
    if (existing) { existing.width = width; existing.height = height; }
    else block.modifications.push({ type: 'size', width, height });

    const sprite = this.sprites[spriteIndex];
    sprite.width = width; sprite.height = height;
    this.updateSelectionHighlight();
  }

  private setBlockTexCoordMod(block: SpriteConditionBlock, spriteIndex: number, texCoordinates: number[]): void {
    const existing = block.modifications.find(m => m.type === 'texture_coordinates');
    if (existing) { existing.texCoordinates = texCoordinates; }
    else block.modifications.push({ type: 'texture_coordinates', texCoordinates });

    const sprite = this.sprites[spriteIndex];
    const metadata = this.spriteMetadata.get(sprite);
    const baseTexture = metadata ? this.textures.get(metadata.textureResource) : undefined;
    if (baseTexture) sprite.texture = this.cropTexture(baseTexture, texCoordinates);
  }

  addConditionBlock(spriteIndex: number): number {
    const original = this.getOriginalSpriteData(spriteIndex);
    if (!original) return -1;
    if (!original.conditions) original.conditions = [];
    original.conditions.push({
      name: `Set ${original.conditions.length + 1}`,
      conditions: { operator: 'AND', checks: [] },
      modifications: [],
    });
    return original.conditions.length - 1;
  }

  /**
   * Remove a condition set. If it was the sprite's selected one, another remaining set is
   * selected in its place — or, if none are left, the sprite falls back to its base values.
   */
  removeConditionBlock(spriteIndex: number, conditionIndex: number): void {
    const original = this.getOriginalSpriteData(spriteIndex);
    if (!original?.conditions) return;
    const sprite = this.sprites[spriteIndex];
    const removedBlock = original.conditions[conditionIndex];
    const wasSelected = sprite ? this.selectedConditionBlockBySprite.get(sprite) === removedBlock : false;

    original.conditions.splice(conditionIndex, 1);
    if (original.conditions.length === 0) original.conditions = undefined;

    if (!sprite || !wasSelected) return;

    if (original.conditions && original.conditions.length > 0) {
      this.selectCondition(spriteIndex, Math.min(conditionIndex, original.conditions.length - 1));
    } else {
      this.restoreSpriteToBase(spriteIndex);
    }
  }

  setConditionBlockName(spriteIndex: number, conditionIndex: number, name: string): void {
    const original = this.getOriginalSpriteData(spriteIndex);
    if (!original?.conditions?.[conditionIndex]) return;
    original.conditions[conditionIndex].name = name;
  }

  setConditionBlockFlags(spriteIndex: number, conditionIndex: number, conditions: RuleConditionGroup): void {
    const original = this.getOriginalSpriteData(spriteIndex);
    if (!original?.conditions?.[conditionIndex]) return;
    original.conditions[conditionIndex].conditions = conditions;
  }

  private static readonly MIN_ZOOM = 0.2;
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
   * Apply gyro scaling to all sprites, matching Android's Scene.applyGyroScaling().
   * Formula: scaleFactor = 1.0 + parallaxMultiplier * 0.1
   * Both the sprite size and position are scaled away from center by this factor.
   */
  enableGyroScaling(): void {
    if (this.isGyroScaled) return;
    for (const sprite of this.sprites) {
      const metadata = this.spriteMetadata.get(sprite);
      if (!metadata) continue;
      const scaleFactor = 1.0 + metadata.parallaxMultiplier * 0.1;
      metadata.preGyroX = metadata.x;
      metadata.preGyroY = metadata.y;
      metadata.preGyroWidth = sprite.width;
      metadata.preGyroHeight = sprite.height;
      sprite.width = sprite.width * scaleFactor;
      sprite.height = sprite.height * scaleFactor;
      metadata.x = metadata.x * scaleFactor;
      metadata.y = metadata.y * scaleFactor;
    }
    this.isGyroScaled = true;
    this.applyAllPositions();
  }

  /**
   * Remove gyro scaling and restore all sprites to their pre-gyro dimensions and positions.
   */
  disableGyroScaling(): void {
    if (!this.isGyroScaled) return;
    for (const sprite of this.sprites) {
      const metadata = this.spriteMetadata.get(sprite);
      if (!metadata) continue;
      if (metadata.preGyroWidth !== undefined) sprite.width = metadata.preGyroWidth;
      if (metadata.preGyroHeight !== undefined) sprite.height = metadata.preGyroHeight;
      if (metadata.preGyroX !== undefined) metadata.x = metadata.preGyroX;
      if (metadata.preGyroY !== undefined) metadata.y = metadata.preGyroY;
      metadata.preGyroX = undefined;
      metadata.preGyroY = undefined;
      metadata.preGyroWidth = undefined;
      metadata.preGyroHeight = undefined;
    }
    this.isGyroScaled = false;
    this.applyAllPositions();
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
   * Capture a 256x256 JPEG snapshot of the current scene for use as a thumbnail.
   * Temporarily centers xFocus to 0.5 and hides the phone guide before capturing,
   * then restores both to their original state. The scene data is never modified.
   * Returns a base64 data URL, or null if the renderer is not ready.
   */
  captureSnapshot(): string | null {
    if (!this.app) return null;

    // Save current state
    const savedXFocus = this.currentXFocus;
    const guideGraphics = this.phoneGuide?.getGraphics() ?? null;
    const savedGuideVisible = guideGraphics?.visible ?? false;

    // Apply thumbnail state: center the scene, hide overlay graphics
    this.setScrollOffset(0.5);
    if (guideGraphics) guideGraphics.visible = false;
    if (this.selectionHighlight) this.selectionHighlight.visible = false;

    // Force a synchronous render so the canvas reflects the temp state
    this.app.renderer.render(this.app.stage);

    // Capture
    const src = this.app.canvas as HTMLCanvasElement;
    const size = 256;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const ctx = offscreen.getContext('2d');
    if (ctx) ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, size, size);
    const result = ctx ? offscreen.toDataURL('image/jpeg', 0.85) : null;

    // Restore original state
    this.setScrollOffset(savedXFocus);
    if (guideGraphics) guideGraphics.visible = savedGuideVisible;
    if (this.selectionHighlight) this.selectionHighlight.visible = true;

    return result;
  }

  /**
   * Swap a texture resource across all sprites that reference it.
   * Evicts the old URL from PixiJS's asset cache so the new file is fetched fresh.
   */
  async replaceTexture(oldResource: string, newResource: string): Promise<void> {
    const affected = this.sprites.filter(
      s => this.spriteMetadata.get(s)?.textureResource === oldResource,
    );
    if (affected.length === 0) return;

    // Load the new texture before touching any sprites so the render loop
    // never sees a frame where the old GPU source has been destroyed.
    await this.loadTexture(newResource);
    const newTexture = this.textures.get(newResource);
    if (!newTexture) return;

    for (const sprite of affected) {
      const metadata = this.spriteMetadata.get(sprite);
      if (!metadata) continue;
      metadata.textureResource = newResource;

      // Re-apply whichever UV crop is currently active for this sprite.
      const block = this.selectedConditionBlockBySprite.get(sprite);
      let texCoords: number[] | undefined;
      if (block) {
        const mod = block.modifications.find(m => m.type === 'texture_coordinates');
        texCoords = mod?.texCoordinates ?? this.conditionPreviewState.get(sprite)?.baseTexCoordinates;
      } else {
        const original = this.originalSceneData?.sprites.find(s => s.name === metadata.name);
        texCoords = original?.texCoordinates;
      }

      sprite.texture = texCoords?.length === 8 ? this.cropTexture(newTexture, texCoords) : newTexture;
    }

    if (this.originalSceneData) {
      for (const s of this.originalSceneData.sprites) {
        if (s.textureResource === oldResource) s.textureResource = newResource;
      }
    }

    // Safe to evict the old entry now that no sprites reference it.
    // Filenames are UUIDs so no cache-busting needed — just drop our local ref.
    this.textures.delete(oldResource);
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
