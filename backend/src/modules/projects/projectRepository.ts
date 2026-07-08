import { pool } from '../../db';
import { type ObjectStatus } from '../common/objectModel';
import { ProjectObject } from './projectObject';

const PROJECT_SCENE_IDS_SQL = `
  ARRAY(
    SELECT s.id FROM scenes s WHERE s.project_id = p.id AND s.status <> 'DELETED' ORDER BY s.label ASC LIMIT 4
  ) AS scene_ids`;

const PROJECT_SIZE_SQL = `
  (
    SELECT COALESCE(SUM(i.size_bytes), 0)
    FROM images i
    WHERE i.id IN (
      SELECT DISTINCT sil.image_id
      FROM scene_image_links sil
      JOIN scenes s ON s.id = sil.scene_id
      WHERE s.project_id = p.id AND s.status <> 'DELETED'
    )
  ) AS total_size_bytes`;

const PROJECT_SELECT_COLUMNS = `p.id, p.name, p.version, p.status, p.created_at, p.updated_at,${PROJECT_SCENE_IDS_SQL},${PROJECT_SIZE_SQL}`;

type ProjectRow = {
  id: string;
  name: string;
  version: number;
  status: ObjectStatus;
  created_at: string;
  updated_at: string;
  scene_ids: string[] | null;
  total_size_bytes: number;
};

export async function selectProjects(opts: { activeOnly?: boolean } = {}) {
  const statusFilter = opts.activeOnly ? `p.status = 'ACTIVE'` : `p.status <> 'DELETED'`;
  const result = await pool.query<ProjectRow>(`
    SELECT ${PROJECT_SELECT_COLUMNS}
    FROM projects p
    WHERE ${statusFilter}
    ORDER BY p.name ASC
  `);
  return result.rows.map(ProjectObject.fromSummaryRow);
}

export async function selectProjectById(projectId: string) {
  const result = await pool.query<ProjectRow>(`
    SELECT ${PROJECT_SELECT_COLUMNS}
    FROM projects p
    WHERE p.id = $1 AND p.status <> 'DELETED'
  `, [projectId]);

  return result.rows[0] ? ProjectObject.fromSummaryRow(result.rows[0]) : null;
}

export async function insertProject(name: string, status: ObjectStatus = 'ACTIVE') {
  const result = await pool.query<{ id: string; name: string; version: number; status: ObjectStatus; created_at: string; updated_at: string }>(
    'INSERT INTO projects (name, status) VALUES ($1, $2) RETURNING id, name, version, status, created_at, updated_at',
    [name, status],
  );
  return ProjectObject.fromSummaryRow({ ...result.rows[0], scene_ids: null });
}

export async function setProjectStatus(projectId: string, status: ObjectStatus) {
  const result = await pool.query(
    `UPDATE projects
    SET status = $2
    WHERE id = $1
    RETURNING id
  `,
    [projectId, status],
  );

  if (!result.rows[0]) {
    return null;
  }

  return selectProjectById(projectId);
}

export async function incrementProjectVersion(projectId: string) {
  await pool.query('UPDATE projects SET version = version + 1 WHERE id = $1', [projectId]);
}

