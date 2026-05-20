import { pool } from '../db';

export async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL UNIQUE,
      label      TEXT NOT NULL,
      data       JSONB NOT NULL,
      project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS images (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename      TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      mime_type     TEXT NOT NULL,
      size_bytes    INTEGER NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS projects_updated_at ON projects;
    CREATE TRIGGER projects_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

    DROP TRIGGER IF EXISTS scenes_updated_at ON scenes;
    CREATE TRIGGER scenes_updated_at
      BEFORE UPDATE ON scenes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  `);

  console.log('Migrations complete');
}
