import { pool } from '../../db';

export async function insertUser(email: string, passwordHash: string) {
  const result = await pool.query<{ id: string; email: string; created_at: string }>(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, passwordHash],
  );
  return result.rows[0];
}

export async function selectUserByEmail(email: string) {
  const result = await pool.query<{ id: string; email: string; password_hash: string; created_at: string }>(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email],
  );
  return result.rows[0] ?? null;
}
