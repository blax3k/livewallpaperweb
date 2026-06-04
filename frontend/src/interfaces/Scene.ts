/**
 * Represents a sprite object in a live wallpaper scene
 */
export interface Sprite {
  id?: string;
  height: number;
  name: string;
  parallaxMultiplier: number;
  positionX: number;
  positionY: number;
  texCoordinates: number[];
  textureResource: string;
  width: number;
}

/**
 * Represents a scene configuration from the JSON scene files
 * Based on the structure of boba_sunset.json and similar scene files
 */
export interface Scene {
  sprites: Sprite[];
  xFocus: number;
  /** Start time as minutes-of-day (0–1439) when this scene becomes available. Defaults to 0 (00:00). */
  startTime?: number;
  /** End time as minutes-of-day (0–1439) until which this scene is available. Defaults to 1439 (23:59). */
  endTime?: number;
}
