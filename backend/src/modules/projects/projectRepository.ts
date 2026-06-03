import { pool } from '../../db';
import { type ObjectStatus } from '../common/objectModel';
import { ProjectObject } from './projectObject';

export async function selectProjects() {
  const result = await pool.query<{
    id: string;
    name: string;
    version: number;
    status: ObjectStatus;
    created_at: string;
    updated_at: string;
    scene_names: string[] | null;
  }>(`
    SELECT p.id, p.name, p.version, p.status, p.created_at, p.updated_at,
      ARRAY(
        SELECT s.name FROM scenes s WHERE s.project_id = p.id AND s.status <> 'DELETED' ORDER BY s.label ASC LIMIT 4
      ) AS scene_names
    FROM projects p
    WHERE p.status <> 'DELETED'
    ORDER BY p.name ASC
  `);
  return result.rows.map(ProjectObject.fromSummaryRow);
}

export async function insertProject(name: string, status: ObjectStatus = 'ACTIVE') {
  const result = await pool.query<{ id: string; name: string; status: ObjectStatus; created_at: string; updated_at: string }>(
    'INSERT INTO projects (name, status) VALUES ($1, $2) RETURNING id, name, status, created_at, updated_at',
    [name, status],
  );
  return ProjectObject.fromCreatedRow(result.rows[0]);
}

export async function incrementProjectVersion(projectId: string) {
  await pool.query('UPDATE projects SET version = version + 1 WHERE id = $1', [projectId]);
}
