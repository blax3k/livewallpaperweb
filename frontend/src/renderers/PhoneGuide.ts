import * as PIXI from 'pixi.js';

/** Common phone/tablet aspect ratios (long-edge:short-edge) selectable for the guide. */
export const PHONE_GUIDE_ASPECT_RATIOS = ['20:9', '19.5:9', '18:9', '16:9','7:5', '3:2', '4:3', '1:1'] as const;
export type PhoneGuideAspectRatio = typeof PHONE_GUIDE_ASPECT_RATIOS[number];

function aspectRatioToWidthOverHeight(aspectRatio: PhoneGuideAspectRatio): number {
  const [long, short] = aspectRatio.split(':').map(Number);
  return short / long;
}

/**
 * Represents an aspect ratio guide with a vertical center line.
 * Used to show the safe area for phone displays during scene viewing.
 * This visual guide is affected by parallax scrolling (xOffset).
 */
export class PhoneGuide {
  private graphics: PIXI.Graphics | null = null;
  private xOffset: number = 0;
  private orientation: 'portrait' | 'landscape' = 'portrait';
  private aspectRatio = aspectRatioToWidthOverHeight('20:9');
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
    this.graphics = new PIXI.Graphics();
    this.draw();
    return this.graphics;
  }

  /**
   * Set the guide's orientation and redraw. In landscape the rectangle is drawn wide/short
   * (rotated 90°) with a horizontal center line marking the vertical center (the yFocus
   * reference), mirroring the vertical line's role marking the xFocus reference in portrait.
   */
  setOrientation(orientation: 'portrait' | 'landscape'): void {
    this.orientation = orientation;
    this.draw();
  }

  /**
   * Change the guide's aspect ratio and redraw.
   */
  setAspectRatio(aspectRatio: PhoneGuideAspectRatio): void {
    this.aspectRatio = aspectRatioToWidthOverHeight(aspectRatio);
    this.draw();
  }

  private draw(): void {
    const g = this.graphics;
    if (!g) return;
    g.clear();

    const { halfWidth, halfHeight } = this.computeDimensions();
    const rectHalfWidth = this.orientation === 'landscape' ? halfHeight : halfWidth;
    const rectHalfHeight = this.orientation === 'landscape' ? halfWidth : halfHeight;

    // Draw rectangle outline with stroke
    g.moveTo(-rectHalfWidth, rectHalfHeight)
      .lineTo(rectHalfWidth, rectHalfHeight)
      .lineTo(rectHalfWidth, -rectHalfHeight)
      .lineTo(-rectHalfWidth, -rectHalfHeight)
      .lineTo(-rectHalfWidth, rectHalfHeight)
      .stroke({
        width: this.LINE_WIDTH,
        color: this.LINE_COLOR,
        alpha: this.LINE_ALPHA,
      });

    // Draw center line: vertical (marks horizontal/xFocus center) in portrait,
    // horizontal (marks vertical/yFocus center) in landscape.
    if (this.orientation === 'landscape') {
      g.moveTo(-rectHalfWidth, 0)
        .lineTo(rectHalfWidth, 0)
        .stroke({
          width: this.LINE_WIDTH,
          color: this.LINE_COLOR,
          alpha: this.LINE_ALPHA,
        });
    } else {
      g.moveTo(0, rectHalfHeight)
        .lineTo(0, -rectHalfHeight)
        .stroke({
          width: this.LINE_WIDTH,
          color: this.LINE_COLOR,
          alpha: this.LINE_ALPHA,
        });
    }
  }

  /**
   * Get the graphics object
   */
  getGraphics(): PIXI.Graphics | null {
    return this.graphics;
  }

  /**
   * Compute the guide rectangle's half-width/half-height (world units), clamped so it
   * never exceeds the WORLD_HEIGHT square.
   */
  private computeDimensions(): { halfWidth: number; halfHeight: number } {
    const visibleWorldBound = this.WORLD_HEIGHT / 2; // = 5.0
    let height = this.GUIDE_HEIGHT;
    let width = height * this.aspectRatio;

    const maxWidth = visibleWorldBound * 2; // = 10.0
    if (width > maxWidth) {
      width = maxWidth;
      height = width / this.aspectRatio;
    }

    return { halfWidth: width / 2, halfHeight: height / 2 };
  }

  /**
   * Half-width of the guide rectangle (world units). Used by SceneRenderer to derive how
   * much xFocus/yFocus panning this reference phone shape has room for, mirroring the
   * Android renderer's viewport slack calculation.
   */
  getHalfWidth(): number {
    return this.computeDimensions().halfWidth;
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
