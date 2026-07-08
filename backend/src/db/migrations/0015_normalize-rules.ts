import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

const CONDITION_TYPE_CHECK = `type IN (
  'flag_active', 'flag_inactive', 'time_of_day', 'day_of_week',
  'scene_count', 'install_duration_hours', 'time_since_flag_change'
)`;
const ACTION_TYPE_CHECK = `type IN ('activate_flag', 'deactivate_flag')`;
const OPERATOR_CHECK = `operator IN ('>=', '<=', '==', '>', '<')`;
const FLAG_CHANGE_TYPE_CHECK = `flag_change_type IN ('activated', 'deactivated')`;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('rule_groups', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: '"projects"', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('rule_groups', 'rule_groups_project_id_name_key', {
    unique: ['project_id', 'name'],
  });

  pgm.createTable('rules', {
    project_id: { type: 'uuid', notNull: true, references: '"projects"', onDelete: 'CASCADE' },
    id: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true },
    group_id: { type: 'uuid', references: '"rule_groups"', onDelete: 'SET NULL' },
    one_shot: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('rules', 'rules_pkey', {
    primaryKey: ['project_id', 'id'],
  });

  pgm.createIndex('rules', 'group_id');

  // One row per OR'd condition group belonging to a rule. `position` orders the groups.
  pgm.createTable('rule_condition_groups', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true },
    rule_id: { type: 'text', notNull: true },
    position: { type: 'integer', notNull: true },
  });

  pgm.addConstraint('rule_condition_groups', 'rule_condition_groups_rule_fk', {
    foreignKeys: {
      columns: ['project_id', 'rule_id'],
      references: 'rules(project_id, id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('rule_condition_groups', 'rule_condition_groups_project_id_rule_id_position_key', {
    unique: ['project_id', 'rule_id', 'position'],
  });

  // Individual checks within a condition group (AND'd together). `position` orders checks
  // for display; evaluation itself doesn't care about order within an AND group.
  pgm.createTable('rule_conditions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    group_id: { type: 'uuid', notNull: true, references: '"rule_condition_groups"', onDelete: 'CASCADE' },
    position: { type: 'integer', notNull: true },
    type: { type: 'text', notNull: true, check: CONDITION_TYPE_CHECK },
    project_id: { type: 'uuid', notNull: true },
    flag_id: { type: 'text' },
    flag_change_type: { type: 'text', check: FLAG_CHANGE_TYPE_CHECK },
    scene_id: { type: 'uuid', references: '"scenes"', onDelete: 'SET NULL' },
    operator: { type: 'text', check: OPERATOR_CHECK },
    int_value: { type: 'integer' },
    start_hour: { type: 'integer', check: 'start_hour BETWEEN 0 AND 23' },
    end_hour: { type: 'integer', check: 'end_hour BETWEEN 0 AND 23' },
    days_of_week: { type: 'integer[]' },
  });

  pgm.addConstraint('rule_conditions', 'rule_conditions_flag_fk', {
    foreignKeys: {
      columns: ['project_id', 'flag_id'],
      references: 'flags(project_id, id)',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('rule_conditions', 'group_id');
  pgm.createIndex('rule_conditions', ['project_id', 'flag_id']);
  pgm.addConstraint('rule_conditions', 'rule_conditions_group_id_position_key', {
    unique: ['group_id', 'position'],
  });

  // Ordered actions fired top-to-bottom when a rule's conditions resolve true.
  pgm.createTable('rule_actions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true },
    rule_id: { type: 'text', notNull: true },
    position: { type: 'integer', notNull: true },
    type: { type: 'text', notNull: true, check: ACTION_TYPE_CHECK },
    flag_id: { type: 'text' },
  });

  pgm.addConstraint('rule_actions', 'rule_actions_rule_fk', {
    foreignKeys: {
      columns: ['project_id', 'rule_id'],
      references: 'rules(project_id, id)',
      onDelete: 'CASCADE',
    },
  });

  pgm.addConstraint('rule_actions', 'rule_actions_flag_fk', {
    foreignKeys: {
      columns: ['project_id', 'flag_id'],
      references: 'flags(project_id, id)',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('rule_actions', ['project_id', 'flag_id']);
  pgm.addConstraint('rule_actions', 'rule_actions_project_id_rule_id_position_key', {
    unique: ['project_id', 'rule_id', 'position'],
  });

  // Backfill `rules` from the old flat projects.rules jsonb array. Rule grouping is new,
  // so every backfilled rule starts Ungrouped.
  pgm.sql(`
    INSERT INTO rules (project_id, id, name, one_shot)
    SELECT p.id, r->>'id', r->>'name', COALESCE((r->>'oneShot')::boolean, false)
    FROM projects p
    CROSS JOIN LATERAL jsonb_array_elements(p.rules) AS r
    WHERE NULLIF(trim(r->>'id'), '') IS NOT NULL
    ON CONFLICT (project_id, id) DO NOTHING
  `);

  // The old shape held one group with a single AND/OR operator for its whole checks list.
  // AND (or a single check, where AND/OR are equivalent) maps straight across as one group.
  // OR with multiple checks has to explode into N single-check groups, OR'd against each
  // other, since the new schema fixes AND-within/OR-across and has no per-group operator —
  // otherwise an old "any of these" rule would silently start requiring "all of these".
  pgm.sql(`
    CREATE TEMP TABLE _rule_condition_staging ON COMMIT DROP AS
    SELECT project_id, rule_id, chk, ord,
      CASE WHEN group_operator = 'OR' AND cnt > 1 THEN (ord - 1) ELSE 0 END AS group_position
    FROM (
      SELECT
        p.id AS project_id,
        r->>'id' AS rule_id,
        r->'conditions'->>'operator' AS group_operator,
        c.chk,
        c.ord,
        COUNT(*) OVER (PARTITION BY p.id, r->>'id') AS cnt
      FROM projects p
      CROSS JOIN LATERAL jsonb_array_elements(p.rules) AS r
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r->'conditions'->'checks', '[]'::jsonb)) WITH ORDINALITY AS c(chk, ord)
      WHERE NULLIF(trim(r->>'id'), '') IS NOT NULL
    ) x
  `);

  pgm.sql(`
    INSERT INTO rule_condition_groups (project_id, rule_id, position)
    SELECT DISTINCT project_id, rule_id, group_position FROM _rule_condition_staging
  `);

  pgm.sql(`
    INSERT INTO rule_conditions
      (group_id, position, type, project_id, flag_id, flag_change_type, scene_id, operator, int_value, start_hour, end_hour, days_of_week)
    SELECT
      rcg.id,
      ROW_NUMBER() OVER (PARTITION BY s.project_id, s.rule_id, s.group_position ORDER BY s.ord) - 1,
      s.chk->>'type',
      s.project_id,
      NULLIF(s.chk->>'flagId', ''),
      NULLIF(s.chk->>'flagChangeType', ''),
      CASE
        WHEN s.chk->>'sceneId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (s.chk->>'sceneId')::uuid
      END,
      NULLIF(s.chk->>'operator', ''),
      (s.chk->>'intValue')::integer,
      (s.chk->>'startHour')::integer,
      (s.chk->>'endHour')::integer,
      CASE WHEN s.chk ? 'daysOfWeek'
        THEN ARRAY(SELECT jsonb_array_elements_text(s.chk->'daysOfWeek'))::integer[]
      END
    FROM _rule_condition_staging s
    JOIN rule_condition_groups rcg
      ON rcg.project_id = s.project_id AND rcg.rule_id = s.rule_id AND rcg.position = s.group_position
  `);

  pgm.sql(`
    INSERT INTO rule_actions (project_id, rule_id, position, type, flag_id)
    SELECT p.id, r->>'id', (a.ord - 1), a.act->>'type', NULLIF(a.act->>'flagId', '')
    FROM projects p
    CROSS JOIN LATERAL jsonb_array_elements(p.rules) AS r
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r->'actions', '[]'::jsonb)) WITH ORDINALITY AS a(act, ord)
    WHERE NULLIF(trim(r->>'id'), '') IS NOT NULL
  `);

  pgm.dropColumns('projects', ['rules']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('projects', {
    rules: { type: 'jsonb', notNull: true, default: '[]' },
  });

  // Lossy: a rule with multiple OR'd condition groups collapses back to just group 0,
  // matching the single-group shape the old column held.
  pgm.sql(`
    UPDATE projects p SET rules = COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'oneShot', r.one_shot,
        'conditions', (
          SELECT jsonb_build_object('operator', 'AND', 'checks', COALESCE(jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
              'type', rc.type,
              'flagId', rc.flag_id,
              'flagChangeType', rc.flag_change_type,
              'sceneId', rc.scene_id,
              'operator', rc.operator,
              'intValue', rc.int_value,
              'startHour', rc.start_hour,
              'endHour', rc.end_hour,
              'daysOfWeek', to_jsonb(rc.days_of_week)
            )) ORDER BY rc.position
          ), '[]'::jsonb))
          FROM rule_condition_groups rcg
          JOIN rule_conditions rc ON rc.group_id = rcg.id
          WHERE rcg.project_id = r.project_id AND rcg.rule_id = r.id AND rcg.position = 0
        ),
        'actions', (
          SELECT COALESCE(jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object('type', ra.type, 'flagId', ra.flag_id)) ORDER BY ra.position
          ), '[]'::jsonb)
          FROM rule_actions ra WHERE ra.project_id = r.project_id AND ra.rule_id = r.id
        )
      ) ORDER BY r.name)
      FROM rules r WHERE r.project_id = p.id
    ), '[]'::jsonb)
  `);

  pgm.dropTable('rule_actions');
  pgm.dropTable('rule_conditions');
  pgm.dropTable('rule_condition_groups');
  pgm.dropTable('rules');
  pgm.dropTable('rule_groups');
}
