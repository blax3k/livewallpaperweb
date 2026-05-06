import * as PIXI from 'pixi.js';
import { Scene, Sprite } from '../interfaces/Scene';
import { PhoneGuide } from './PhoneGuide';
import type { SpriteEntry } from '../controls/SpriteListPanel';

interface SpriteMetadata {
  x: number;
  parallaxMultiplier: number;
  name: string;
  visible: boolean;
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
  private readonly ZOOM_SCALE = 1.6; // Zoom multiplier (1.5 = 50% bigger, adjust as needed)

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

      this.app = new PIXI.Application();
      await this.app.init({
        width: size,
        height: size,
        backgroundColor: 0x000000,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio,
      });

      this.container.appendChild(this.app.canvas);
      const canvas = this.app.canvas as HTMLCanvasElement;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.style.display = 'block';

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
    this.app.stage.removeChildren();

    // Load textures and create sprites
    for (const spriteData of sceneData.sprites) {
      await this.loadTexture(spriteData.textureResource);
      const sprite = await this.createSprite(spriteData);
      
      if (sprite) {
        this.sprites.push(sprite);
        this.spriteMetadata.set(sprite, {
          x: sprite.x,
          parallaxMultiplier: spriteData.parallaxMultiplier,
          name: spriteData.name,
          visible: true,
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

    // Fit scene to view and apply initial xFocus
    this.fitSceneToView();
    this.setScrollOffset(sceneData.xFocus);
  }

  /**
   * Scale and position the scene to fit the canvas view
   * Centers the view around world x=0 (the room sprite)
   */
  private fitSceneToView(): void {
    if (!this.app || this.sprites.length === 0) return;

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

    // Add padding
    const padding = 0.1;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const sceneWidth = maxX - minX;
    const sceneHeight = maxY - minY;
    const canvasWidth = this.app.canvas.width;
    const canvasHeight = this.app.canvas.height;

    // Calculate scale to fit scene in canvas
    const scale = Math.min(canvasWidth / sceneWidth, canvasHeight / sceneHeight);
    const zoomedScale = scale * this.ZOOM_SCALE;

    // Position stage with world origin (0,0) centered on canvas
    this.app.stage.scale.set(zoomedScale, zoomedScale);
    this.app.stage.x = canvasWidth / 2;
    this.app.stage.y = canvasHeight / 2;
  }

  /**
   * Load a texture image from the public folder
   */
  private async loadTexture(resourceName: string): Promise<void> {
    if (this.textures.has(resourceName)) return;

    try {
      const texture = await PIXI.Assets.load(`/images/${resourceName}.png`);
      this.textures.set(resourceName, texture);
    } catch (error) {
      console.error(`Failed to load texture: ${resourceName}`, error);
    }
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
    const SCROLL_SCALE = 5.0;
    const scrollOffset = (0.5 - xFocus) * SCROLL_SCALE;

    for (const sprite of this.sprites) {
      const metadata = this.spriteMetadata.get(sprite);
      if (metadata) {
        sprite.x = metadata.x + scrollOffset * metadata.parallaxMultiplier;
      }
    }
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
      return { name: metadata?.name || `Sprite ${index}`, visible: metadata?.visible ?? true };
    });
  }

  toggleSpriteByIndex(index: number): void {
    if (index >= 0 && index < this.sprites.length) {
      this.toggleSpriteVisibility(this.sprites[index]);
    }
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
