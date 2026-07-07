import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('flag_groups', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: '"projects"', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('flag_groups', 'flag_groups_project_id_name_key', {
    unique: ['project_id', 'name'],
  });

  pgm.createTable('flags', {
    project_id: { type: 'uuid', notNull: true, references: '"projects"', onDelete: 'CASCADE' },
    id: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true },
    group_id: { type: 'uuid', references: '"flag_groups"', onDelete: 'SET NULL' },
    default_active: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('flags', 'flags_pkey', {
    primaryKey: ['project_id', 'id'],
  });

  pgm.createIndex('flags', 'group_id');

  // Backfill flag_groups from the distinct, non-blank `group` values in projects.flags
  pgm.sql(`
    INSERT INTO flag_groups (project_id, name)
    SELECT DISTINCT p.id, NULLIF(trim(f->>'group'), '')
    FROM projects p, jsonb_array_elements(p.flags) AS f
    WHERE NULLIF(trim(f->>'group'), '') IS NOT NULL
    ON CONFLICT (project_id, name) DO NOTHING
  `);

  // Backfill flags, resolving each flag's group name to the new flag_groups row
  pgm.sql(`
    INSERT INTO flags (project_id, id, name, group_id, default_active)
    SELECT
      p.id,
      f->>'id',
      f->>'name',
      fg.id,
      COALESCE((f->>'defaultActive')::boolean, false)
    FROM projects p
    CROSS JOIN LATERAL jsonb_array_elements(p.flags) AS f
    LEFT JOIN flag_groups fg
      ON fg.project_id = p.id AND fg.name = NULLIF(trim(f->>'group'), '')
    WHERE NULLIF(trim(f->>'id'), '') IS NOT NULL
    ON CONFLICT (project_id, id) DO NOTHING
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('flags');
  pgm.dropTable('flag_groups');
}
