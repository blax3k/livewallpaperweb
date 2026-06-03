import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_status') THEN
        CREATE TYPE entity_status AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');
      END IF;
    END
    $$;
  `);

  pgm.sql(`
    ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS status entity_status NOT NULL DEFAULT 'ACTIVE'
  `);

  pgm.sql(`
    ALTER TABLE scenes
    ADD COLUMN IF NOT EXISTS status entity_status NOT NULL DEFAULT 'ACTIVE'
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE scenes DROP COLUMN IF EXISTS status');
  pgm.sql('ALTER TABLE projects DROP COLUMN IF EXISTS status');
  pgm.sql('DROP TYPE IF EXISTS entity_status');
}