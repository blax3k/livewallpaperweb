import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

// time_of_day conditions gained optional minute precision (startMinute/endMinute). Existing rows
// stay NULL and are treated as :00, preserving their prior whole-hour behaviour.
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('rule_conditions', {
    start_minute: { type: 'integer', check: 'start_minute BETWEEN 0 AND 59' },
    end_minute: { type: 'integer', check: 'end_minute BETWEEN 0 AND 59' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('rule_conditions', ['start_minute', 'end_minute']);
}
