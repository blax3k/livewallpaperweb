import type { SpriteConditionBlock, SceneFlagDeclarations, SceneSlot } from '@livewallpaper/types';

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
  conditions?: SpriteConditionBlock[];
}

/**
 * Represents a scene configuration from the JSON scene files
 * Based on the structure of boba_sunset.json and similar scene files
 */
export interface Scene {
  sprites: Sprite[];
  /**
   * Compositional variations resolved at wake time (see sceneResolver.resolveScene). Each slot
   * resolves to one of its options; omitted for scenes with no variable content.
   */
  slots?: SceneSlot[];
  xFocus: number;
  yFocus: number;
  flags?: SceneFlagDeclarations;
}
