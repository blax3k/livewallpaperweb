import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE images ADD COLUMN IF NOT EXISTS thumb_filename TEXT');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE images DROP COLUMN IF EXISTS thumb_filename');
}
