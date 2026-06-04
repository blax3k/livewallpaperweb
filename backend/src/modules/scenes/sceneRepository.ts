import type { Scene } from '@livewallpaper/types';
import type { PoolClient } from 'pg';
import { pool } from '../../db';
import { type ObjectStatus } from '../common/objectModel';
import { SceneObject } from './sceneObject';
import { SpriteObject } from '../sprites/spriteObject';

type SceneBaseRow = {
  id: string;
  name: string;
  label: string;
  status: ObjectStatus;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  x_focus: number;
  start_time: number | null;
  end_time: number | null;
};

type SpriteBaseRow = {
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

export async function selectSceneSummaries(projectId?: string) {
  if (projectId) {
    const result = await pool.query<{ id: string; name: string; label: string; status: ObjectStatus }>(
      `SELECT id, name, label, status
       FROM scenes
       WHERE project_id = $1 AND status <> 'DELETED'
       ORDER BY label ASC`,
      [projectId],
    );
    return result.rows.map(SceneObject.fromSummaryRow);
  }

  const result = await pool.query<{ id: string; name: string; label: string; status: ObjectStatus }>(
    `SELECT id, name, label, status
     FROM scenes
     WHERE status <> 'DELETED'
     ORDER BY label ASC`,
  );
  return result.rows.map(SceneObject.fromSummaryRow);
}

export async function selectSceneById(id: string) {
  const sceneResult = await pool.query<SceneBaseRow>(
    `SELECT id, name, label, status, project_id, created_at, updated_at, x_focus, start_time, end_time
     FROM scenes WHERE id = $1 AND status <> 'DELETED'`,
    [id],
  );
  if (!sceneResult.rows[0]) return null;

  const spriteResult = await pool.query<SpriteBaseRow>(
    `SELECT sp.id, sp.name, img.filename AS image_filename,
            sp.width, sp.height, sp.position_x, sp.position_y, sp.parallax_multiplier, sp.tex_coordinates
     FROM sprites sp
     LEFT JOIN images img ON img.id = sp.image_id
     WHERE sp.scene_id = $1
     ORDER BY sp.sort_order`,
    [id],
  );

  return SceneObject.fromRow({
    ...sceneResult.rows[0],
    sprites: spriteResult.rows.map(SpriteObject.fromRow),
  });
}

export async function insertScene(
  client: PoolClient,
  input: { name: string; label: string; data: Scene; projectId?: string },
): Promise<{ id: string }> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO scenes (name, label, project_id, status, x_focus, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [input.name, input.label, input.projectId ?? null, 'ACTIVE', input.data.xFocus ?? 0, input.data.startTime ?? null, input.data.endTime ?? null],
  );
  return result.rows[0];
}

export async function updateScene(
  client: PoolClient,
  id: string,
  label: string,
  data: Scene,
): Promise<{ id: string; project_id: string | null } | null> {
  const result = await client.query<{ id: string; project_id: string | null }>(
    `UPDATE scenes SET label = $2, x_focus = $3, start_time = $4, end_time = $5, updated_at = NOW()
     WHERE id = $1 AND status <> 'DELETED'
     RETURNING id, project_id`,
    [id, label, data.xFocus ?? 0, data.startTime ?? null, data.endTime ?? null],
  );
  return result.rows[0] ?? null;
}

export async function deleteSceneRecordById(id: string) {
  const result = await pool.query(
    'DELETE FROM scenes WHERE id = $1 RETURNING id, project_id',
    [id],
  );
  return result.rows[0] ?? null;
}
