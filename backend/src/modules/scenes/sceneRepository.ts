import type { Scene } from '@livewallpaper/types';
import { pool } from '../../db';
import { type ObjectStatus } from '../common/objectModel';
import { SceneObject } from './sceneObject';

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
  const result = await pool.query<{
    id: string;
    name: string;
    label: string;
    status: ObjectStatus;
    data: Scene;
    project_id: string | null;
    created_at: string;
    updated_at: string;
  }>('SELECT * FROM scenes WHERE id = $1 AND status <> $2', [id, 'DELETED']);
  return result.rows[0] ? SceneObject.fromRow(result.rows[0]) : null;
}

export async function insertScene(input: {
  name: string;
  label: string;
  data: unknown;
  projectId?: string;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<{
      id: string;
      name: string;
      label: string;
      status: ObjectStatus;
      data: Scene;
      project_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      'INSERT INTO scenes (name, label, data, project_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [input.name, input.label, input.data, input.projectId ?? null, 'ACTIVE'],
    );

    if (input.projectId) {
      await client.query('UPDATE projects SET version = version + 1 WHERE id = $1', [input.projectId]);
    }

    await client.query('COMMIT');
    return SceneObject.fromRow(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateSceneRecord(id: string, label: string, data: unknown) {
  const result = await pool.query<{
    id: string;
    name: string;
    label: string;
    status: ObjectStatus;
    data: Scene;
    project_id: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `UPDATE scenes SET label = $2, data = $3, updated_at = NOW()
     WHERE id = $1 AND status <> 'DELETED'
     RETURNING *`,
    [id, label, data],
  );
  return result.rows[0] ? SceneObject.fromRow(result.rows[0]) : null;
}

export async function deleteSceneRecordById(id: string) {
  const result = await pool.query(
    'DELETE FROM scenes WHERE id = $1 RETURNING id, project_id',
    [id],
  );
  return result.rows[0] ?? null;
}
