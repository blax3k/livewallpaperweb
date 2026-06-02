import { pool } from '../../db';

export async function selectProjects() {
  const result = await pool.query(`
    SELECT p.id, p.name, p.version,
      ARRAY(
        SELECT s.name FROM scenes s WHERE s.project_id = p.id ORDER BY s.label ASC LIMIT 4
      ) AS scene_names
    FROM projects p ORDER BY p.name ASC
  `);
  return result.rows;
}

export async function insertProject(name: string) {
  const result = await pool.query(
    'INSERT INTO projects (name) VALUES ($1) RETURNING id, name',
    [name],
  );
  return result.rows[0];
}

export async function incrementProjectVersion(projectId: string) {
  await pool.query('UPDATE projects SET version = version + 1 WHERE id = $1', [projectId]);
}
