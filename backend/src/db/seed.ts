import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { pool } from '../db';
import { runMigrations } from './migrations';

async function seed() {
  await runMigrations();

  const scenesDir = path.join(__dirname, '../../../frontend/public/scenes');
  const files = fs.readdirSync(scenesDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const name = file.replace('.json', '');
    const label = name
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const data = JSON.parse(fs.readFileSync(path.join(scenesDir, file), 'utf-8'));

    await pool.query(
      `INSERT INTO scenes (name, label, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET label = $2, data = $3`,
      [name, label, data]
    );
    console.log(`Seeded: ${name}`);
  }

  await pool.end();
  console.log('Seed complete');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
