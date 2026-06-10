import type { FastifyInstance } from 'fastify';
import { registerUser, loginUser, logoutSession } from './authService';
import { COOKIE_NAME, COOKIE_MAX_AGE } from './constants';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    signed: true,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

export async function registerAuthRoutes(server: FastifyInstance): Promise<void> {
  server.post<{ Body: { email: string; password: string } }>(
    '/api/auth/register',
    async (req, reply) => {
      if (!req.body) {
        return reply.status(400).send({ error: 'Email and password are required' });
      }
      const { email, password } = req.body;
      if (!email || !password) {
        return reply.status(400).send({ error: 'Email and password are required' });
      }
      try {
        const { user, sessionId } = await registerUser(email, password);
        reply.setCookie(COOKIE_NAME, sessionId, cookieOptions());
        return reply.status(201).send({ id: user.id, email: user.email });
      } catch (err: unknown) {
        if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'EMAIL_TAKEN') {
          return reply.status(409).send({ error: 'Email already in use' });
        }
        throw err;
      }
    },
  );

  server.post<{ Body: { email: string; password: string } }>(
    '/api/auth/login',
    async (req, reply) => {
      if (!req.body) {
        return reply.status(400).send({ error: 'Email and password are required' });
      }
      const { email, password } = req.body;
      if (!email || !password) {
        return reply.status(400).send({ error: 'Email and password are required' });
      }
      try {
        const { user, sessionId } = await loginUser(email, password);
        reply.setCookie(COOKIE_NAME, sessionId, cookieOptions());
        return { id: user.id, email: user.email };
      } catch (err: unknown) {
        if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'INVALID_CREDENTIALS') {
          return reply.status(401).send({ error: 'Invalid credentials' });
        }
        throw err;
      }
    },
  );

  server.post(
    '/api/auth/logout',
    { preHandler: [server.authenticate] },
    async (req, reply) => {
      if (req.sessionId) {
        await logoutSession(req.sessionId);
      }
      reply.clearCookie(COOKIE_NAME, { path: '/' });
      return reply.status(204).send();
    },
  );

  server.get(
    '/api/auth/me',
    { preHandler: [server.authenticate] },
    async (req) => {
      return { id: req.user!.id, email: req.user!.email };
    },
  );
}
