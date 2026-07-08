import type { FastifyInstance } from 'fastify';
import type { RuleDefinition } from '@livewallpaper/types';
import { HttpStatus } from '../../utils/httpStatus';
import {
  createRuleGroup,
  deleteRuleGroup,
  getRuleGroups,
  getRules,
  renameRuleGroup,
  saveRules,
} from './ruleService';

export async function registerRuleRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Params: { id: string } }>('/api/projects/:id/rules', async (req) => {
    return getRules(req.params.id);
  });

  server.put<{ Params: { id: string }; Body: RuleDefinition[] }>('/api/projects/:id/rules', async (req, reply) => {
    const ok = await saveRules(req.params.id, req.body);
    if (!ok) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
    return reply.status(HttpStatus.NO_CONTENT).send();
  });

  server.get<{ Params: { id: string } }>('/api/projects/:id/rule-groups', async (req, reply) => {
    const groups = await getRuleGroups(req.params.id);
    if (groups === null) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
    return groups;
  });

  server.post<{ Params: { id: string }; Body: { name: string } }>('/api/projects/:id/rule-groups', async (req, reply) => {
    if (!req.body?.name?.trim()) {
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Group name is required' });
    }
    try {
      const group = await createRuleGroup(req.params.id, req.body.name.trim());
      if (!group) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
      return reply.status(HttpStatus.CREATED).send(group);
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'GROUP_NAME_TAKEN') {
        return reply.status(HttpStatus.CONFLICT).send({ error: err.message });
      }
      throw err;
    }
  });

  server.patch<{ Params: { id: string; groupId: string }; Body: { name: string } }>('/api/projects/:id/rule-groups/:groupId', async (req, reply) => {
    if (!req.body?.name?.trim()) {
      return reply.status(HttpStatus.BAD_REQUEST).send({ error: 'Group name is required' });
    }
    try {
      const group = await renameRuleGroup(req.params.id, req.params.groupId, req.body.name.trim());
      if (!group) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Group not found' });
      return group;
    } catch (err: unknown) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'GROUP_NAME_TAKEN') {
        return reply.status(HttpStatus.CONFLICT).send({ error: err.message });
      }
      throw err;
    }
  });

  server.delete<{ Params: { id: string; groupId: string } }>('/api/projects/:id/rule-groups/:groupId', async (req, reply) => {
    const deleted = await deleteRuleGroup(req.params.id, req.params.groupId);
    if (!deleted) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Group not found' });
    return reply.status(HttpStatus.NO_CONTENT).send();
  });
}
