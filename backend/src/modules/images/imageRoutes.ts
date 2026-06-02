import type { FastifyInstance } from 'fastify';
import type { ImageStorage } from '../../storage';
import { deleteImage, ImageUploadError, listImages, uploadImage } from './imageService';

interface ImageRouteDeps {
  storage: ImageStorage;
}

export async function registerImageRoutes(
  server: FastifyInstance,
  deps: ImageRouteDeps,
): Promise<void> {
  server.get('/api/images', async () => {
    return listImages();
  });

  server.post('/api/images', async (req, reply) => {
    try {
      const image = await uploadImage(await req.file(), deps.storage);

      return reply.status(201).send(image);
    } catch (err) {
      if (err instanceof ImageUploadError) {
        return reply.status(err.statusCode).send(err.payload);
      }
      throw err;
    }
  });

  server.delete<{ Params: { id: string } }>('/api/images/:id', async (req, reply) => {
    const deleted = await deleteImage(req.params.id, deps.storage);
    if (!deleted) {
      return reply.status(404).send({ error: 'Image not found' });
    }

    return reply.status(204).send();
  });
}
