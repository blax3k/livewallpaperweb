import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Compositional scene variations (SceneSlot[]) serialize as JSONB on the scene, alongside
  // flag_declarations. Nullable/additive: existing scenes keep resolving to just their sprites.
  pgm.addColumns('scenes', {
    slots: { type: 'jsonb', notNull: false },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('scenes', ['slots']);
}
