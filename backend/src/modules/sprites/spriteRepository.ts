import type { Sprite } from '@livewallpaper/types';
import type { PoolClient } from 'pg';
import { pool } from '../../db';

function filenameFromTextureResource(textureResource: string): string | null {
  return textureResource.startsWith('/uploads/') ? textureResource.slice(9) : null;
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
): Promise<void> {
  const filenames = sprites
    .map(s => filenameFromTextureResource(s.textureResource))
    .filter((f): f is string => f !== null);
  const imageIdMap = await resolveImageIds(client, filenames);

  await client.query('DELETE FROM sprites WHERE scene_id = $1', [sceneId]);

  for (let i = 0; i < sprites.length; i++) {
    const sp = sprites[i];
    const filename = filenameFromTextureResource(sp.textureResource);
    const imageId = filename ? (imageIdMap.get(filename) ?? null) : null;
    await client.query(
      `INSERT INTO sprites (scene_id, sort_order, name, image_id, width, height, position_x, position_y, parallax_multiplier, tex_coordinates)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [sceneId, i, sp.name, imageId, sp.width, sp.height, sp.positionX, sp.positionY, sp.parallaxMultiplier, sp.texCoordinates],
    );
  }
}
