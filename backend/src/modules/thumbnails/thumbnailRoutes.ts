import type { FastifyInstance } from 'fastify';
import type { ImageStorage } from '../../storage';
import { pool } from '../../db';
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

      await pool.query(`UPDATE scenes SET updated_at = NOW() WHERE id = $1`, [req.params.id]);

      return reply.status(204).send();
    },
  );
}
