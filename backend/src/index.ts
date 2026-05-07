import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import path from 'path';
import fs from 'fs';

const server = Fastify({
  logger: true,
});

// Health check
server.get('/health', async () => {
  return { status: 'ok' };
});

// List available scenes
server.get('/api/scenes', async () => {
  const scenesDir = path.join(__dirname, '../../frontend/public/scenes');
  const files = fs.readdirSync(scenesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const value = f.replace('.json', '');
      const label = value
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      return { value, label };
    });
  return files;
});

// Start server
const start = async () => {
  try {
    // Register plugins
    await server.register(cors, {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    });

    await server.register(staticFiles, {
      root: path.join(__dirname, '../../frontend/public'),
    });

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST ?? '0.0.0.0';
    await server.listen({ port, host });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
