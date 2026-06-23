import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate' with { 'resolution-mode': 'import' };

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE scene_image_links (
      scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
      image_id UUID NOT NULL REFERENCES images(id) ON DELETE CASCADE,
      PRIMARY KEY (scene_id, image_id)
    )
  `);

  // Backfill base textures — sprites.image_id is already resolved
  pgm.sql(`
    INSERT INTO scene_image_links (scene_id, image_id)
    SELECT DISTINCT scene_id, image_id FROM sprites WHERE image_id IS NOT NULL
    ON CONFLICT DO NOTHING
  `);

  // Backfill condition-block texture modifications from sprites.conditions JSONB
  pgm.sql(`
    INSERT INTO scene_image_links (scene_id, image_id)
    SELECT DISTINCT sp.scene_id, i.id
    FROM sprites sp,
         jsonb_array_elements(NULLIF(sp.conditions, 'null'::jsonb)) AS cond,
         jsonb_array_elements(NULLIF(cond->'modifications', 'null'::jsonb)) AS mod
    JOIN images i ON i.filename = substr(mod->>'textureResource', 10)
    WHERE sp.conditions IS NOT NULL
      AND mod->>'type' = 'texture'
      AND mod->>'textureResource' LIKE '/uploads/%'
    ON CONFLICT DO NOTHING
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('scene_image_links');
}
