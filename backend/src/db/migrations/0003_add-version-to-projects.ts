import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('projects', {
    version: { type: 'integer', notNull: true, default: 1 },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('projects', 'version');
}
