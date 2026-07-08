import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

// Chapters are flags: `is_chapter` marks a flag as a chapter milestone and `chapter_order`
// gives it a position in the spine. This lets chapter advancement reuse the existing
// activate_flag/deactivate_flag rule actions and flag_active/flag_inactive conditions
// instead of a parallel chapters table + its own rule-action/condition types. `chapter_order`
// is a sort key, not a displayed chapter number, so deleting a chapter never requires
// renumbering the rest of the spine.
const CHAPTER_ORDER_PRESENCE_CHECK = `(is_chapter AND chapter_order IS NOT NULL) OR (NOT is_chapter AND chapter_order IS NULL)`;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('flags', {
    is_chapter: { type: 'boolean', notNull: true, default: false },
    chapter_order: { type: 'integer' },
  });

  pgm.addConstraint('flags', 'flags_chapter_order_presence_check', {
    check: CHAPTER_ORDER_PRESENCE_CHECK,
  });

  // Partial unique index rather than a table-wide unique constraint: chapter_order only
  // needs to be unique among chapter flags, and non-chapter flags always have it NULL.
  pgm.createIndex('flags', ['project_id', 'chapter_order'], {
    name: 'flags_chapter_order_unique_idx',
    unique: true,
    where: 'is_chapter',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('flags', ['project_id', 'chapter_order'], { name: 'flags_chapter_order_unique_idx' });
  pgm.dropConstraint('flags', 'flags_chapter_order_presence_check');
  pgm.dropColumns('flags', ['is_chapter', 'chapter_order']);
}
