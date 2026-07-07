import type { FastifyInstance } from 'fastify';
import type { RuleDefinition } from '@livewallpaper/types';
import { HttpStatus } from '../../utils/httpStatus';
import { archiveProject, createProject, getProject, listProjects, unarchiveProject } from './projectService';
import {
  selectProjectRules,
  updateProjectRules,
} from './projectRepository';

export async function registerProjectRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Querystring: { activeOnly?: string } }>('/api/projects', async (req) => {
    return listProjects({ activeOnly: req.query.activeOnly === 'true' });
  });

  server.post<{ Body: { name: string } }>('/api/projects', async (req, reply) => {
    const project = await createProject(req.body.name);
    return reply.status(HttpStatus.CREATED).send(project);
  });

  server.get<{ Params: { id: string } }>('/api/projects/:id', async (req, reply) => {
    const project = await getProject(req.params.id);
    if (!project) {
      return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
    }
    return project;
  });

  server.patch<{ Params: { id: string } }>('/api/projects/:id/archive', async (req, reply) => {
    const project = await archiveProject(req.params.id);
    if (!project) {
      return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
    }

    return project;
  });

  server.patch<{ Params: { id: string } }>('/api/projects/:id/unarchive', async (req, reply) => {
    const project = await unarchiveProject(req.params.id);
    if (!project) {
      return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
    }

    return project;
  });

  // ── Rules ──────────────────────────────────────────────────────────────────

  server.get<{ Params: { id: string } }>('/api/projects/:id/rules', async (req, reply) => {
    const rules = await selectProjectRules(req.params.id);
    if (rules === null) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
    return rules;
  });

  server.put<{ Params: { id: string }; Body: RuleDefinition[] }>('/api/projects/:id/rules', async (req, reply) => {
    const ok = await updateProjectRules(req.params.id, req.body);
    if (!ok) return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Project not found' });
    return reply.status(HttpStatus.NO_CONTENT).send();
  });
}
