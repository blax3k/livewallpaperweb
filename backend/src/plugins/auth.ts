import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { resolveSession } from '../modules/auth/authService';
import { COOKIE_NAME } from '../modules/auth/constants';

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const raw = request.cookies[COOKIE_NAME];
    if (!raw) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const { valid, value: sessionId } = request.unsignCookie(raw);
    if (!valid || !sessionId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const session = await resolveSession(sessionId);
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    request.sessionId = sessionId;
    request.user = { id: session.user_id, email: session.user_email };
  });
}

export default fp(authPlugin);
