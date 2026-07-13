import type { Sprite, SceneSlot, SpriteModification } from '@livewallpaper/types';
import type { PoolClient } from 'pg';
import { pool } from '../../db';

function filenameFromTextureResource(textureResource: string): string | null {
  return textureResource.startsWith('/uploads/') ? textureResource.slice(9) : null;
}

/** Add any texture-swap filenames referenced by a list of modifications. */
function addModificationFilenames(mods: SpriteModification[] | undefined, filenames: Set<string>): void {
  for (const mod of mods ?? []) {
    if (mod.type === 'texture' && mod.textureResource) {
      const fn = filenameFromTextureResource(mod.textureResource);
      if (fn) filenames.add(fn);
    }
  }
}

/** Add a sprite's base texture plus any textures its condition blocks can swap in. */
function addSpriteFilenames(sprite: Sprite, filenames: Set<string>): void {
  const base = filenameFromTextureResource(sprite.textureResource);
  if (base) filenames.add(base);
  for (const block of sprite.conditions ?? []) {
    addModificationFilenames(block.modifications, filenames);
  }
}

/**
 * Every image filename a scene can render: base sprites plus slot options' contributed sprites
 * and their base-sprite overrides. Slot sprites live in the scene's JSONB `slots` column rather
 * than the sprites table, but still need scene_image_links so their images count as in-use.
 */
function collectAllFilenames(sprites: Sprite[], slots: SceneSlot[] = []): string[] {
  const filenames = new Set<string>();
  for (const sprite of sprites) addSpriteFilenames(sprite, filenames);
  for (const slot of slots) {
    for (const option of slot.options) {
      for (const sprite of option.sprites ?? []) addSpriteFilenames(sprite, filenames);
      for (const override of option.overrides ?? []) addModificationFilenames(override.modifications, filenames);
    }
  }
  return [...filenames];
}

async function resolveImageIds(client: PoolClient, filenames: string[]): Promise<Map<string, string>> {
  if (filenames.length === 0) return new Map();
  const result = await client.query<{ id: string; filename: string }>(
    'SELECT id, filename FROM images WHERE filename = ANY($1)',
    [filenames],
  );
  return new Map(result.rows.map(r => [r.filename, r.id]));
}

export async function updateSpriteName(
  spriteId: string,
  name: string,
): Promise<{ project_id: string | null } | null> {
  const result = await pool.query<{ project_id: string | null }>(
    `UPDATE sprites sp
     SET name = $2
     FROM scenes sc
     WHERE sp.id = $1 AND sc.id = sp.scene_id
     RETURNING sc.project_id`,
    [spriteId, name],
  );
  return result.rows[0] ?? null;
}

export async function replaceSpritesForScene(
  client: PoolClient,
  sceneId: string,
  sprites: Sprite[],
  slots: SceneSlot[] = [],
): Promise<void> {
  // Base sprites are rewritten into the sprites table below; slot sprites persist in the scene's
  // JSONB `slots` column, but both feed scene_image_links so slot-only images stay marked in-use.
  const allFilenames = collectAllFilenames(sprites, slots);
  const imageIdMap = await resolveImageIds(client, allFilenames);

  await client.query('DELETE FROM sprites WHERE scene_id = $1', [sceneId]);

  for (let i = 0; i < sprites.length; i++) {
    const sp = sprites[i];
    const filename = filenameFromTextureResource(sp.textureResource);
    const imageId = filename ? (imageIdMap.get(filename) ?? null) : null;
    await client.query(
      `INSERT INTO sprites (scene_id, sort_order, name, image_id, width, height, position_x, position_y, parallax_multiplier, tex_coordinates, conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [sceneId, i, sp.name, imageId, sp.width, sp.height, sp.positionX, sp.positionY, sp.parallaxMultiplier, sp.texCoordinates, sp.conditions ? JSON.stringify(sp.conditions) : null],
    );
  }

  const usedImageIds = allFilenames
    .map(f => imageIdMap.get(f))
    .filter((id): id is string => id != null);

  await client.query('DELETE FROM scene_image_links WHERE scene_id = $1', [sceneId]);
  if (usedImageIds.length > 0) {
    await client.query(
      'INSERT INTO scene_image_links (scene_id, image_id) SELECT $1, unnest($2::uuid[]) ON CONFLICT DO NOTHING',
      [sceneId, usedImageIds],
    );
  }
}
