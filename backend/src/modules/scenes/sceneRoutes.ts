import type { FastifyInstance } from 'fastify';
import type { ImageStorage } from '../../storage';
import {
  createScene,
  getSceneByName,
  getSceneSummaryById,
  listScenes,
  deleteSceneByName,
  saveSceneThumbnail,
  saveSceneByName,
} from './sceneService';

interface SceneRouteDeps {
  thumbnailStorage: ImageStorage;
}

export async function registerSceneRoutes(
  server: FastifyInstance,
  deps: SceneRouteDeps,
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

  server.put<{ Params: { name: string }; Body: { dataUrl: string } }>(
    '/api/scenes/:name/thumbnail',
    async (req, reply) => {
      const ok = await saveSceneThumbnail(req.params.name, req.body.dataUrl, deps.thumbnailStorage);
      if (!ok) {
        return reply.status(400).send({ error: 'Invalid dataUrl' });
      }

      return reply.status(204).send();
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
