import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

// Scene start_time/end_time were a pre-flags time-window mechanism, superseded by time-of-day
// flags (flags.required). Nothing reads or writes them anymore, so drop the dead columns.
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('scenes', ['start_time', 'end_time']);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('scenes', {
    start_time: { type: 'integer', notNull: false },
    end_time: { type: 'integer', notNull: false },
  });
}
