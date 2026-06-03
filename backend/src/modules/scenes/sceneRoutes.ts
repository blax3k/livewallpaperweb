import type { FastifyInstance } from 'fastify';
import {
  createScene,
  getSceneByName,
  getSceneSummaryById,
  listScenes,
  deleteSceneByName,
  saveSceneByName,
} from './sceneService';

export async function registerSceneRoutes(
  server: FastifyInstance,
): Promise<void> {
  server.get<{ Querystring: { projectId?: string } }>('/api/scenes', async (req) => {
    return listScenes(req.query.projectId);
  });

  server.get<{ Params: { id: string } }>('/api/scenes/id/:id', async (req, reply) => {
    const scene = await getSceneSummaryById(req.params.id);
    if (!scene) {
      return reply.status(404).send({ error: 'Scene not found' });
    }

    return scene;
  });

  server.get<{ Params: { name: string } }>('/api/scenes/:name', async (req, reply) => {
    const scene = await getSceneByName(req.params.name);
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

  server.put<{ Params: { name: string }; Body: { label: string; data: unknown } }>(
    '/api/scenes/:name',
    async (req) => {
      return saveSceneByName(req.params.name, req.body.label, req.body.data);
    },
  );

  server.delete<{ Params: { name: string } }>('/api/scenes/:name', async (req, reply) => {
    const deleted = await deleteSceneByName(req.params.name);
    if (!deleted) {
      return reply.status(404).send({ error: 'Scene not found' });
    }

    return reply.status(204).send();
  });
}
