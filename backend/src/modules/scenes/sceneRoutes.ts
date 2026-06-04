import type { FastifyInstance } from 'fastify';
import type { Scene } from '@livewallpaper/types';
import {
  createScene,
  getSceneById,
  listScenes,
  deleteSceneById,
  saveSceneById,
} from './sceneService';
import { renameSpriteById } from '../sprites/spriteService';

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

  server.post<{ Body: { name: string; label: string; data: Scene; projectId?: string } }>(
    '/api/scenes',
    async (req, reply) => {
      const scene = await createScene(req.body);
      return reply.status(201).send(scene);
    },
  );

  server.put<{ Params: { id: string }; Body: { label: string; data: Scene } }>(
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

  server.patch<{ Params: { id: string }; Body: { name: string } }>(
    '/api/sprites/:id',
    async (req, reply) => {
      const renamed = await renameSpriteById(req.params.id, req.body.name);
      if (!renamed) {
        return reply.status(404).send({ error: 'Sprite not found' });
      }

      return reply.status(204).send();
    },
  );
}
