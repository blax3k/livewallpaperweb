import type { FastifyInstance } from 'fastify';
import type { ImageStorage } from '../../storage';
import { deleteImage, getImageSizesByFilenames, ImageUploadError, listImages, uploadImage } from './imageService';
import { HttpStatus } from '../../utils/httpStatus';

interface ImageRouteDeps {
  storage: ImageStorage;
  thumbnailStorage: ImageStorage;
}

export async function registerImageRoutes(
  server: FastifyInstance,
  deps: ImageRouteDeps,
): Promise<void> {
  server.get<{Params: {projectId: string}}>('/api/images/:projectId', async (req) => {
    return listImages(req.params.projectId);
  });

  server.post<{ Querystring: { projectId?: string } }>('/api/images', async (req, reply) => {
    try {
      const projectId = req.query.projectId;
      const image = await uploadImage(projectId, await req.file(), deps.storage, deps.thumbnailStorage);

      return reply.status(HttpStatus.CREATED).send(image);
    } catch (err) {
      if (err instanceof ImageUploadError) {
        return reply.status(err.statusCode).send(err.payload);
      }
      throw err;
    }
  });

  server.post<{ Body: { filenames: string[] } }>('/api/images/by-filenames', async (req) => {
    return getImageSizesByFilenames(req.body.filenames ?? []);
  });

  server.delete<{ Params: { id: string } }>('/api/images/:id', async (req, reply) => {
    const deleted = await deleteImage(req.params.id, deps.storage, deps.thumbnailStorage);
    if (!deleted) {
      return reply.status(HttpStatus.NOT_FOUND).send({ error: 'Image not found' });
    }

    return reply.status(HttpStatus.NO_CONTENT).send();
  });
}
