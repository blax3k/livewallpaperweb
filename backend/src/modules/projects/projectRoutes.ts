import type { FastifyInstance } from 'fastify';
import { HttpStatus } from '../../utils/httpStatus';
import { archiveProject, createProject, getProject, listProjects, unarchiveProject } from './projectService';

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
}
