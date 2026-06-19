import { pool } from '../../db';

export async function selectImages(projectId: string) {
  const result = await pool.query('SELECT * FROM images WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
  return result.rows;
}

export async function insertImageRecord(input: {
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  thumbFilename: string | null;
  projectId: string | undefined;
}) {
  const result = await pool.query(
    'INSERT INTO images (filename, original_name, mime_type, size_bytes, thumb_filename, project_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [input.filename, input.originalName, input.mimeType, input.sizeBytes, input.thumbFilename, input.projectId],
  );

  return result.rows[0];
}

export async function deleteImageRecordById(id: string) {
  const result = await pool.query('DELETE FROM images WHERE id = $1 RETURNING filename, thumb_filename', [id]);
  return result.rows[0] ?? null;
}

export async function selectImageSizesByFilenames(filenames: string[]): Promise<Record<string, number>> {
  if (filenames.length === 0) return {};
  const result = await pool.query<{ filename: string; size_bytes: number }>(
    'SELECT filename, size_bytes FROM images WHERE filename = ANY($1)',
    [filenames],
  );
  return Object.fromEntries(result.rows.map(r => [r.filename, r.size_bytes]));
}
