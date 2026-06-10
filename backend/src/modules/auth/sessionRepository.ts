import { pool } from '../../db';
import { SESSION_TTL_DAYS } from './constants';

export async function insertSession(userId: string) {
  const result = await pool.query<{ id: string; expires_at: string }>(
    `INSERT INTO sessions (user_id, expires_at)
     VALUES ($1, now() + interval '${SESSION_TTL_DAYS} days')
     RETURNING id, expires_at`,
    [userId],
  );
  return result.rows[0];
}

export async function selectSessionWithUser(sessionId: string) {
  const result = await pool.query<{ user_id: string; user_email: string }>(
    `SELECT s.user_id, u.email AS user_email
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [sessionId],
  );
  return result.rows[0] ?? null;
}

export async function deleteSession(sessionId: string) {
  await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}
