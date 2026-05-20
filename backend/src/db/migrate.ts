import 'dotenv/config';
import path from 'path';
import { runner } from 'node-pg-migrate';

const args = process.argv.slice(2);
const direction = ((args.find((a) => a === 'up' || a === 'down')) ?? 'up') as 'up' | 'down';
const fake = args.includes('--fake');

runner({
  databaseUrl: process.env.DATABASE_URL!,
  dir: path.join(__dirname, 'migrations'),
  direction,
  migrationsTable: 'pgmigrations',
  fake,
  log: (msg) => console.log(msg),
})
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
