import type { FastifyInstance } from 'fastify';
import {
  createScene,
  getSceneById,
  listScenes,
  deleteSceneById,
  saveSceneById,
} from './sceneService';

export async function registerSceneRoutes(
  server: FastifyInstance,
): Promise<void> {
  server.get<{ Querystring: { projectId?: string } }>('/api/scenes', async (req) => {
    return listScenes(req.query.projectId);
  });

  server.get<{ Params: { id: string } }>('/api/scenes/:id', async (req, reply) => {
    const scene = await getSceneById(req.params.id);
    if (!scene) {
      return reply.status(404).send({ error: 'Scene not found' });
    }

    return scene;
  });

  server.post<{ Body: { name: string; label: string; data: unknown; projectId?: string } }>(
    '/api/scenes',
    async (req, reply) => {
      const scene = await createScene(req.body);
      return reply.status(201).send(scene);
    },
  );

  server.put<{ Params: { id: string }; Body: { label: string; data: unknown } }>(
    '/api/scenes/:id',
    async (req, reply) => {
      const scene = await saveSceneById(req.params.id, req.body.label, req.body.data);
      if (!scene) {
        return reply.status(404).send({ error: 'Scene not found' });
      }

      return scene;
    },
  );

  server.delete<{ Params: { id: string } }>('/api/scenes/:id', async (req, reply) => {
    const deleted = await deleteSceneById(req.params.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Scene not found' });
    }

    return reply.status(204).send();
  });
}
