import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

// Postgres' ON DELETE SET NULL on a multi-column FK nulls every column in the FK by
// default, not just the one pointing at the deleted row. For rule_conditions_flag_fk and
// rule_actions_flag_fk that meant deleting a flag also nulled project_id, which is
// NOT NULL, so replaceFlagsForProject (which deletes+reinserts every flag on any save,
// even an unrelated group change) blew up with a not-null violation. Restricting the
// SET NULL to flag_id keeps project_id intact.
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('rule_conditions', 'rule_conditions_flag_fk');
  pgm.sql(`
    ALTER TABLE rule_conditions
      ADD CONSTRAINT rule_conditions_flag_fk
      FOREIGN KEY (project_id, flag_id) REFERENCES flags (project_id, id)
      ON DELETE SET NULL (flag_id)
  `);

  pgm.dropConstraint('rule_actions', 'rule_actions_flag_fk');
  pgm.sql(`
    ALTER TABLE rule_actions
      ADD CONSTRAINT rule_actions_flag_fk
      FOREIGN KEY (project_id, flag_id) REFERENCES flags (project_id, id)
      ON DELETE SET NULL (flag_id)
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('rule_actions', 'rule_actions_flag_fk');
  pgm.addConstraint('rule_actions', 'rule_actions_flag_fk', {
    foreignKeys: {
      columns: ['project_id', 'flag_id'],
      references: 'flags(project_id, id)',
      onDelete: 'SET NULL',
    },
  });

  pgm.dropConstraint('rule_conditions', 'rule_conditions_flag_fk');
  pgm.addConstraint('rule_conditions', 'rule_conditions_flag_fk', {
    foreignKeys: {
      columns: ['project_id', 'flag_id'],
      references: 'flags(project_id, id)',
      onDelete: 'SET NULL',
    },
  });
}
