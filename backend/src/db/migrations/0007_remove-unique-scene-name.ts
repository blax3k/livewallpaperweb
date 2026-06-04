import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE scenes DROP CONSTRAINT IF EXISTS scenes_name_key');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('ALTER TABLE scenes ADD CONSTRAINT scenes_name_key UNIQUE (name)');
}
