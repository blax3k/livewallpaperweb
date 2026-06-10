import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

// This migration was applied to the database from another branch.
// The stub is here so node-pg-migrate can correctly order later migrations.
export async function up(_pgm: MigrationBuilder): Promise<void> {}

export async function down(_pgm: MigrationBuilder): Promise<void> {}
