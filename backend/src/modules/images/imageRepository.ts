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
}) {
  const result = await pool.query(
    'INSERT INTO images (filename, original_name, mime_type, size_bytes) VALUES ($1, $2, $3, $4) RETURNING *',
    [input.filename, input.originalName, input.mimeType, input.sizeBytes],
  );

  return result.rows[0];
}

export async function deleteImageRecordById(id: string) {
  const result = await pool.query('DELETE FROM images WHERE id = $1 RETURNING filename', [id]);
  return result.rows[0] ?? null;
}
