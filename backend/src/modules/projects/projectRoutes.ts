import type { FastifyInstance } from 'fastify';
import type { FlagDefinition, RuleDefinition } from '@livewallpaper/types';
import { archiveProject, createProject, getProject, listProjects, unarchiveProject } from './projectService';
import {
  selectProjectFlags,
  updateProjectFlags,
  selectProjectRules,
  updateProjectRules,
} from './projectRepository';

export async function registerProjectRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Querystring: { activeOnly?: string } }>('/api/projects', async (req) => {
    return listProjects({ activeOnly: req.query.activeOnly === 'true' });
  });

  server.post<{ Body: { name: string } }>('/api/projects', async (req, reply) => {
    const project = await createProject(req.body.name);
    return reply.status(201).send(project);
  });

  server.get<{ Params: { id: string } }>('/api/projects/:id', async (req, reply) => {
    const project = await getProject(req.params.id);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }
    return project;
  });

  server.patch<{ Params: { id: string } }>('/api/projects/:id/archive', async (req, reply) => {
    const project = await archiveProject(req.params.id);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return project;
  });

  server.patch<{ Params: { id: string } }>('/api/projects/:id/unarchive', async (req, reply) => {
    const project = await unarchiveProject(req.params.id);
    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return project;
  });

  // ── Flags ──────────────────────────────────────────────────────────────────

  server.get<{ Params: { id: string } }>('/api/projects/:id/flags', async (req, reply) => {
    const flags = await selectProjectFlags(req.params.id);
    if (flags === null) return reply.status(404).send({ error: 'Project not found' });
    return flags;
  });

  server.put<{ Params: { id: string }; Body: FlagDefinition[] }>('/api/projects/:id/flags', async (req, reply) => {
    const ok = await updateProjectFlags(req.params.id, req.body);
    if (!ok) return reply.status(404).send({ error: 'Project not found' });
    return reply.status(204).send();
  });

  // ── Rules ──────────────────────────────────────────────────────────────────

  server.get<{ Params: { id: string } }>('/api/projects/:id/rules', async (req, reply) => {
    const rules = await selectProjectRules(req.params.id);
    if (rules === null) return reply.status(404).send({ error: 'Project not found' });
    return rules;
  });

  server.put<{ Params: { id: string }; Body: RuleDefinition[] }>('/api/projects/:id/rules', async (req, reply) => {
    const ok = await updateProjectRules(req.params.id, req.body);
    if (!ok) return reply.status(404).send({ error: 'Project not found' });
    return reply.status(204).send();
  });
}
