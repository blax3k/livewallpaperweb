import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Project-level flag and rule definitions (replace assets/flags.json and assets/rules.json)
  pgm.addColumns('projects', {
    flags: { type: 'jsonb', notNull: true, default: '[]' },
    rules: { type: 'jsonb', notNull: true, default: '[]' },
  });

  // Scene-level flag selection declarations (required / scored / excluded)
  pgm.addColumns('scenes', {
    flag_declarations: { type: 'jsonb', notNull: false },
  });

  // Sprite-level condition blocks (visibility, position, tex-coord overrides)
  pgm.addColumns('sprites', {
    conditions: { type: 'jsonb', notNull: false },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('sprites', ['conditions']);
  pgm.dropColumns('scenes', ['flag_declarations']);
  pgm.dropColumns('projects', ['flags', 'rules']);
}
