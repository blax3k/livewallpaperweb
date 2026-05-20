import 'dotenv/config';
import { pool } from '../db';

const projectId = process.argv[2];

if (!projectId) {
  console.error('Usage: tsx src/db/assign-project.ts <project-uuid>');
  process.exit(1);
}

const result = await pool.query(
  'UPDATE scenes SET project_id = $1 WHERE project_id IS NULL RETURNING name',
  [projectId],
);

console.log(`Updated ${result.rowCount} scene(s):`, result.rows.map(r => r.name));
await pool.end();
