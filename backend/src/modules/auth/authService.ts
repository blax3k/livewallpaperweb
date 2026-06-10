import argon2 from 'argon2';
import { insertUser, selectUserByEmail } from './userRepository';
import { insertSession, deleteSession, selectSessionWithUser } from './sessionRepository';

export async function registerUser(email: string, password: string) {
  const passwordHash = await argon2.hash(password);
  let user: Awaited<ReturnType<typeof insertUser>>;
  try {
    user = await insertUser(email, passwordHash);
  } catch (err: unknown) {
    // Postgres unique-violation on users.email
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === '23505') {
      throw Object.assign(new Error('Email already in use'), { code: 'EMAIL_TAKEN' });
    }
    throw err;
  }
  const session = await insertSession(user.id);
  return { user, sessionId: session.id };
}

export async function loginUser(email: string, password: string) {
  const row = await selectUserByEmail(email);
  if (!row) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
  }
  const valid = await argon2.verify(row.password_hash, password);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
  }
  const session = await insertSession(row.id);
  return { user: { id: row.id, email: row.email }, sessionId: session.id };
}

export async function logoutSession(sessionId: string) {
  await deleteSession(sessionId);
}

export async function resolveSession(sessionId: string) {
  return selectSessionWithUser(sessionId);
}
