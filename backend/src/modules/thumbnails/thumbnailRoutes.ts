import type { FastifyInstance } from 'fastify';
import type { ImageStorage } from '../../storage';
import { saveSceneThumbnail } from './thumbnailService';

interface ThumbnailRouteDeps {
  thumbnailStorage: ImageStorage;
}

export async function registerThumbnailRoutes(
  server: FastifyInstance,
  deps: ThumbnailRouteDeps,
): Promise<void> {
  server.put<{ Params: { id: string }; Body: { dataUrl: string } }>(
    '/api/scenes/:id/thumbnail',
    async (req, reply) => {
      const ok = await saveSceneThumbnail(req.params.id, req.body.dataUrl, deps.thumbnailStorage);
      if (!ok) {
        return reply.status(400).send({ error: 'Invalid dataUrl' });
      }

      return reply.status(204).send();
    },
  );
}
