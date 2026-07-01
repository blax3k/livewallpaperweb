import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('scenes', {
    y_focus: { type: 'double precision', notNull: true, default: 0.5 },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('scenes', ['y_focus']);
}
