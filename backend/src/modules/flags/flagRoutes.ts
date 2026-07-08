import type { FastifyInstance } from 'fastify';
import type { FlagDefinition } from '@livewallpaper/types';
import { HttpStatus } from '../../utils/httpStatus';
import {
  createFlagGroup,
  deleteFlagGroup,
  getFlagGroups,
  getFlags,
  getFlagUsage,
  getFlagUsageCounts,
  renameFlagGroup,
  saveFlags,
} from './flagService';

export async function registerFlagRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Params: { id: string } }>('/api/projects/:id/flags', async (req) => {
    return getFlags(req.params.id);
  });

  server.put<{ Params: { id: string }; Body: FlagDefinition[] }>('/api/projects/:id/flags', async (req, reply) => {
    try {
      const ok = await saveFlags(req.params.id, req.body);
      if (!ok) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
      return reply.status(HttpStatus.NO_CONTENT).send();
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'CHAPTER_ORDER_TAKEN') {
        return reply.status(HttpStatus.CONFLICT).send({ error: err.message });
      }
      throw err;
    }
  });

  server.get<{ Params: { id: string } }>('/api/projects/:id/flags/usage', async (req) => {
    return getFlagUsageCounts(req.params.id);
  });

  server.get<{ Params: { id: string; flagId: string } }>('/api/projects/:id/flags/:flagId/usage', async (req) => {
    return getFlagUsage(req.params.id, req.params.flagId);
  });

  server.get<{ Params: { id: string } }>('/api/projects/:id/flag-groups', async (req, reply) => {
    const groups = await getFlagGroups(req.params.id);
    if (groups === null) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
    return groups;
  });

  server.post<{ Params: { id: string }; Body: { name: string } }>('/api/projects/:id/flag-groups', async (req, reply) => {
    if (!req.body?.name?.trim()) {
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Group name is required' });
    }
    try {
      const group = await createFlagGroup(req.params.id, req.body.name.trim());
      if (!group) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
      return reply.status(HttpStatus.CREATED).send(group);
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'GROUP_NAME_TAKEN') {
        return reply.status(HttpStatus.CONFLICT).send({ error: err.message });
      }
      throw err;
    }
  });

  server.patch<{ Params: { id: string; groupId: string }; Body: { name: string } }>('/api/projects/:id/flag-groups/:groupId', async (req, reply) => {
    if (!req.body?.name?.trim()) {
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Group name is required' });
    }
    try {
      const group = await renameFlagGroup(req.params.id, req.params.groupId, req.body.name.trim());
      if (!group) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Group not found' });
      return group;
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'GROUP_NAME_TAKEN') {
        return reply.status(HttpStatus.CONFLICT).send({ error: err.message });
      }
      throw err;
    }
  });

  server.delete<{ Params: { id: string; groupId: string } }>('/api/projects/:id/flag-groups/:groupId', async (req, reply) => {
    const deleted = await deleteFlagGroup(req.params.id, req.params.groupId);
    if (!deleted) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Group not found' });
    return reply.status(HttpStatus.NO_CONTENT).send();
  });
}
