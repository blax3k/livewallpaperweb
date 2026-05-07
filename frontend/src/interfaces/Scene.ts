/**
 * Represents a sprite object in a live wallpaper scene
 */
export interface Sprite {
  height: number;
  name: string;
  parallaxMultiplier: number;
  positionX: number;
  positionY: number;
  texCoordinates: number[];
  textureResource: string;
  textureResourceId: number;
  width: number;
}

/**
 * Represents a scene configuration from the JSON scene files
 * Based on the structure of boba_sunset.json and similar scene files
 */
export interface Scene {
  sprites: Sprite[];
  xFocus: number;
}
