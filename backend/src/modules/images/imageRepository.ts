import { pool } from '../../db';

export async function selectImages() {
  const result = await pool.query('SELECT * FROM images ORDER BY created_at DESC');
  return result.rows;
}

export async function insertImageRecord(input: {
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  thumbFilename: string | null;
}) {
  const result = await pool.query(
    'INSERT INTO images (filename, original_name, mime_type, size_bytes, thumb_filename) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [input.filename, input.originalName, input.mimeType, input.sizeBytes, input.thumbFilename],
  );

  return result.rows[0];
}

export async function deleteImageRecordById(id: string) {
  const result = await pool.query('DELETE FROM images WHERE id = $1 RETURNING filename, thumb_filename', [id]);
  return result.rows[0] ?? null;
}
