import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('scenes', {
    x_focus: { type: 'double precision', notNull: true, default: 0 },
    start_time: { type: 'integer', notNull: false },
    end_time: { type: 'integer', notNull: false },
  });

  pgm.createTable('sprites', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    scene_id: {
      type: 'uuid',
      notNull: true,
      references: '"scenes"',
      onDelete: 'CASCADE',
    },
    sort_order: { type: 'integer', notNull: true },
    name: { type: 'text', notNull: true },
    image_id: {
      type: 'uuid',
      notNull: false,
      references: '"images"',
      onDelete: 'SET NULL',
    },
    width: { type: 'double precision', notNull: true },
    height: { type: 'double precision', notNull: true },
    position_x: { type: 'double precision', notNull: true },
    position_y: { type: 'double precision', notNull: true },
    parallax_multiplier: { type: 'double precision', notNull: true },
    tex_coordinates: { type: 'double precision[]', notNull: true },
  });

  pgm.createIndex('sprites', 'scene_id');

  pgm.dropColumns('scenes', ['data']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('sprites');
  pgm.dropColumns('scenes', ['x_focus', 'start_time', 'end_time']);
  pgm.sql(`ALTER TABLE scenes ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'`);
}
