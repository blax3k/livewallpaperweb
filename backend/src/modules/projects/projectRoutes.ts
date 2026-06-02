import type { FastifyInstance } from 'fastify';
import { createProject, listProjects } from './projectService';

export async function registerProjectRoutes(server: FastifyInstance): Promise<void> {
  server.get('/api/projects', async () => {
    return listProjects();
  });

  server.post<{ Body: { name: string } }>('/api/projects', async (req, reply) => {
    const project = await createProject(req.body.name);
    return reply.status(201).send(project);
  });
}
