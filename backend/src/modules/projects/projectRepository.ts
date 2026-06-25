import type { FlagDefinition, RuleDefinition } from '@livewallpaper/types';
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

export async function selectProjectFlags(projectId: string): Promise<FlagDefinition[]> {
  const result = await pool.query<{ flags: FlagDefinition[] }>(
    'SELECT flags FROM projects WHERE id = $1 AND status <> $2',
    [projectId, 'DELETED'],
  );
  return result.rows[0]?.flags ?? [];
}

export async function updateProjectFlags(projectId: string, flags: FlagDefinition[]): Promise<boolean> {
  const result = await pool.query(
    'UPDATE projects SET flags = $2, updated_at = NOW() WHERE id = $1 AND status <> $3',
    [projectId, JSON.stringify(flags), 'DELETED'],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function selectProjectRules(projectId: string): Promise<RuleDefinition[]> {
  const result = await pool.query<{ rules: RuleDefinition[] }>(
    'SELECT rules FROM projects WHERE id = $1 AND status <> $2',
    [projectId, 'DELETED'],
  );
  return result.rows[0]?.rules ?? [];
}

export async function updateProjectRules(projectId: string, rules: RuleDefinition[]): Promise<boolean> {
  const result = await pool.query(
    'UPDATE projects SET rules = $2, updated_at = NOW() WHERE id = $1 AND status <> $3',
    [projectId, JSON.stringify(rules), 'DELETED'],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function selectFlagUsage(projectId: string, flagId: string): Promise<{ scenes: string[]; rules: string[] }> {
  const scenesResult = await pool.query<{ name: string }>(
    `SELECT DISTINCT s.name
     FROM scenes s
     WHERE s.project_id = $1
       AND s.status <> 'DELETED'
       AND (
         jsonb_path_exists(s.flag_declarations, '$.required[*] ? (@ == $f)', jsonb_build_object('f', $2))
         OR jsonb_path_exists(s.flag_declarations, '$.excluded[*] ? (@ == $f)', jsonb_build_object('f', $2))
         OR jsonb_path_exists(s.flag_declarations, '$.scored[*].flagId ? (@ == $f)', jsonb_build_object('f', $2))
         OR EXISTS (
           SELECT 1 FROM sprites sp WHERE sp.scene_id = s.id
             AND jsonb_path_exists(sp.conditions, '$[*].conditions.checks[*].flagId ? (@ == $f)', jsonb_build_object('f', $2))
         )
       )
     ORDER BY s.name`,
    [projectId, flagId],
  );

  const rulesResult = await pool.query<{ rules: RuleDefinition[] }>(
    'SELECT rules FROM projects WHERE id = $1 AND status <> $2',
    [projectId, 'DELETED'],
  );
  const allRules: RuleDefinition[] = rulesResult.rows[0]?.rules ?? [];
  const matchingRules = allRules
    .filter(rule =>
      rule.conditions?.checks.some(c => c.flagId === flagId) ||
      rule.actions.some(a => a.flagId === flagId),
    )
    .map(rule => rule.name);

  return { scenes: scenesResult.rows.map(r => r.name), rules: matchingRules };
}
