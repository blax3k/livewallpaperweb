import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE scenes
    ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES "projects" ON DELETE SET NULL
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('scenes', 'project_id');
}
