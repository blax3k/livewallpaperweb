import { pool } from '../../db';

export async function selectSceneSummaries(projectId?: string) {
  if (projectId) {
    const result = await pool.query(
      'SELECT id, name, label FROM scenes WHERE project_id = $1 ORDER BY label ASC',
      [projectId],
    );
    return result.rows;
  }

  const result = await pool.query('SELECT id, name, label FROM scenes ORDER BY label ASC');
  return result.rows;
}

export async function selectSceneSummaryById(id: string) {
  const result = await pool.query('SELECT id, name, label FROM scenes WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function selectSceneByName(name: string) {
  const result = await pool.query('SELECT * FROM scenes WHERE name = $1', [name]);
  return result.rows[0] ?? null;
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
    const result = await client.query(
      'INSERT INTO scenes (name, label, data, project_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [input.name, input.label, input.data, input.projectId ?? null],
    );

    if (input.projectId) {
      await client.query('UPDATE projects SET version = version + 1 WHERE id = $1', [input.projectId]);
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertSceneRecord(name: string, label: string, data: unknown) {
  const result = await pool.query(
    `INSERT INTO scenes (name, label, data)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET label = EXCLUDED.label, data = EXCLUDED.data
     RETURNING *`,
    [name, label, data],
  );

  return result.rows[0];
}

export async function deleteSceneRecordByName(name: string) {
  const result = await pool.query(
    'DELETE FROM scenes WHERE name = $1 RETURNING id, project_id',
    [name],
  );
  return result.rows[0] ?? null;
}
