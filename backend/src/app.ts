import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import Fastify from 'fastify';
import path from 'path';
import type { ImageStorage } from './storage';
import authPlugin from './plugins/auth';
import { registerAuthRoutes } from './modules/auth';
import { registerImageRoutes } from './modules/images';
import { registerProjectRoutes } from './modules/projects';
import { registerSceneRoutes } from './modules/scenes';
import { registerThumbnailRoutes } from './modules/thumbnails/thumbnailRoutes';

interface BuildServerDeps {
  uploadsDir: string;
  thumbnailsDir: string;
  imageThumbnailsDir: string;
  imageStorage: ImageStorage;
  thumbnailStorage: ImageStorage;
  imageThumbnailStorage: ImageStorage;
}

export async function buildServer(deps: BuildServerDeps) {
  const server = Fastify({
    logger: true,
  });

  await server.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });

  if (!process.env.COOKIE_SECRET) {
    throw new Error('COOKIE_SECRET environment variable is required');
  }

  await server.register(cookie, {
    secret: process.env.COOKIE_SECRET,
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

  await server.register(staticFiles, {
    root: deps.imageThumbnailsDir,
    prefix: '/image-thumbnails/',
    decorateReply: false,
  });

  await server.register(authPlugin);

  server.get('/health', async () => {
    return { status: 'ok' };
  });

  await registerAuthRoutes(server);

  // All routes below require a valid session
  await server.register(async (protected_) => {
    protected_.addHook('preHandler', server.authenticate);

    await registerProjectRoutes(protected_);
    await registerImageRoutes(protected_, { storage: deps.imageStorage, thumbnailStorage: deps.imageThumbnailStorage });
    await registerSceneRoutes(protected_);
    await registerThumbnailRoutes(protected_, { thumbnailStorage: deps.thumbnailStorage });
  });

  // SPA catch-all: serve index.html for /project/* (covers /project/:id and /project/:id/scene/:sceneId)
  server.get('/project/*', (req, reply) => {
    reply.sendFile('index.html', path.join(__dirname, '../../frontend/public'));
  });

  return server;
}
