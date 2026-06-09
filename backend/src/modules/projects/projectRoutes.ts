import type { FastifyInstance } from 'fastify';
import { archiveProject, createProject, listProjects, unarchiveProject } from './projectService';

export async function registerProjectRoutes(server: FastifyInstance): Promise<void> {
  server.get<{ Querystring: { activeOnly?: string } }>('/api/projects', async (req) => {
    return listProjects({ activeOnly: req.query.activeOnly === 'true' });
  });

  server.post<{ Body: { name: string } }>('/api/projects', async (req, reply) => {
    const project = await createProject(req.body.name);
    return reply.status(201).send(project);
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
}
