import type { Sprite } from '@livewallpaper/types';

type SpriteRow = {
  id: string;
  name: string;
  image_filename: string | null;
  width: number;
  height: number;
  position_x: number;
  position_y: number;
  parallax_multiplier: number;
  tex_coordinates: number[];
};

export class SpriteObject {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly textureResource: string,
    public readonly width: number,
    public readonly height: number,
    public readonly positionX: number,
    public readonly positionY: number,
    public readonly parallaxMultiplier: number,
    public readonly texCoordinates: number[],
  ) {}

  static fromRow(row: SpriteRow): SpriteObject {
    return new SpriteObject(
      row.id,
      row.name,
      row.image_filename ? `/uploads/${row.image_filename}` : '',
      row.width,
      row.height,
      row.position_x,
      row.position_y,
      row.parallax_multiplier,
      row.tex_coordinates,
    );
  }

  toSprite(): Sprite {
    return {
      id: this.id,
      name: this.name,
      textureResource: this.textureResource,
      width: this.width,
      height: this.height,
      positionX: this.positionX,
      positionY: this.positionY,
      parallaxMultiplier: this.parallaxMultiplier,
      texCoordinates: this.texCoordinates,
    };
  }
}
