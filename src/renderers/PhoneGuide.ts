import * as PIXI from 'pixi.js';

/**
 * Represents a 21:9 aspect ratio guide with a vertical center line.
 * Used to show the safe area for phone displays during scene viewing.
 * This visual guide is affected by parallax scrolling (xOffset).
 */
export class PhoneGuide {
  private graphics: PIXI.Graphics | null = null;
  private xOffset: number = 0;
  private readonly ASPECT_RATIO = 9 / 21; // 21:9
  private readonly WORLD_HEIGHT = 10; // Match world height
  private readonly GUIDE_HEIGHT = 9.99; // Slightly smaller than world height
  private readonly LINE_WIDTH = 0.05;
  private readonly LINE_COLOR = 0x00ff00; // Green
  private readonly LINE_ALPHA = 0.7;

  constructor() {}

  /**
   * Create the phone guide graphics
   */
  createGraphics(): PIXI.Graphics {
    // Calculate dimensions
    const visibleWorldBound = this.WORLD_HEIGHT / 2; // = 5.0
    let height = this.GUIDE_HEIGHT;
    let width = height * this.ASPECT_RATIO;

    // Clamp width to visible bounds
    const maxWidth = visibleWorldBound * 2; // = 10.0
    if (width > maxWidth) {
      width = maxWidth;
      height = width / this.ASPECT_RATIO;
    }

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    // Create graphics
    const g = new PIXI.Graphics();

    // Draw rectangle outline with stroke
    g.moveTo(-halfWidth, halfHeight)
      .lineTo(halfWidth, halfHeight)
      .lineTo(halfWidth, -halfHeight)
      .lineTo(-halfWidth, -halfHeight)
      .lineTo(-halfWidth, halfHeight)
      .stroke({
        width: this.LINE_WIDTH,
        color: this.LINE_COLOR,
        alpha: this.LINE_ALPHA,
      });

    // Draw vertical center line
    g.moveTo(0, halfHeight)
      .lineTo(0, -halfHeight)
      .stroke({
        width: this.LINE_WIDTH,
        color: this.LINE_COLOR,
        alpha: this.LINE_ALPHA,
      });

    this.graphics = g;
    return g;
  }

  /**
   * Get the graphics object
   */
  getGraphics(): PIXI.Graphics | null {
    return this.graphics;
  }

  /**
   * Set the x-offset for parallax scrolling
   */
  setXOffset(xOffset: number): void {
    this.xOffset = xOffset;
    if (this.graphics) {
      this.graphics.x = xOffset;
    }
  }

  /**
   * Get the x-offset
   */
  getXOffset(): number {
    return this.xOffset;
  }

  /**
   * Destroy the graphics
   */
  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}
