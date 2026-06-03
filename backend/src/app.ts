import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import Fastify from 'fastify';
import path from 'path';
import type { ImageStorage } from './storage';
import { registerImageRoutes } from './modules/images';
import { registerProjectRoutes } from './modules/projects';
import { registerSceneRoutes } from './modules/scenes';
import { registerThumbnailRoutes } from './modules/thumbnails/thumbnailRoutes';

interface BuildServerDeps {
  uploadsDir: string;
  thumbnailsDir: string;
  imageStorage: ImageStorage;
  thumbnailStorage: ImageStorage;
}

export async function buildServer(deps: BuildServerDeps) {
  const server = Fastify({
    logger: true,
  });

  await server.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
  });

  await server.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 },
  });

  await server.register(staticFiles, {
    root: path.join(__dirname, '../../frontend/public'),
  });

  await server.register(staticFiles, {
    root: deps.uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  await server.register(staticFiles, {
    root: deps.thumbnailsDir,
    prefix: '/thumbnails/',
    decorateReply: false,
  });

  server.get('/health', async () => {
    return { status: 'ok' };
  });

  await registerProjectRoutes(server);
  await registerImageRoutes(server, { storage: deps.imageStorage });
  await registerSceneRoutes(server);
  await registerThumbnailRoutes(server, { thumbnailStorage: deps.thumbnailStorage });

  // SPA catch-all: serve index.html for /project/* (covers /project/:id and /project/:id/scene/:sceneId)
  server.get('/project/*', (req, reply) => {
    reply.sendFile('index.html', path.join(__dirname, '../../frontend/public'));
  });

  return server;
}
