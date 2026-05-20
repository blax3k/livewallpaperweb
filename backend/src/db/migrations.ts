import path from 'path';
import { runner } from 'node-pg-migrate';

export async function runMigrations() {
  await runner({
    databaseUrl: process.env.DATABASE_URL!,
    dir: path.join(__dirname, 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    log: (msg) => console.log(msg),
  });
}
