import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'path';
import { randomUUID } from 'crypto';
import { pool } from './db';
import { runMigrations } from './db/migrations';
import { LocalStorage } from './storage';

const server = Fastify({
  logger: true,
});

const uploadsDir = path.join(__dirname, '../data/uploads');
const storage = new LocalStorage(uploadsDir);

const thumbnailsDir = path.join(__dirname, '../data/thumbnails');
const thumbnailStorage = new LocalStorage(thumbnailsDir);

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

// List all projects
server.get('/api/projects', async () => {
  const result = await pool.query('SELECT id, name FROM projects ORDER BY name ASC');
  return result.rows;
});

// Create a new project
server.post<{ Body: { name: string } }>('/api/projects', async (req, reply) => {
  const { name } = req.body;
  const result = await pool.query(
    'INSERT INTO projects (name) VALUES ($1) RETURNING id, name',
    [name],
  );
  return reply.status(201).send(result.rows[0]);
});

// Health check
server.get('/health', async () => {
  return { status: 'ok' };
});

// List all uploaded images (from DB)
server.get('/api/images', async () => {
  const result = await pool.query('SELECT * FROM images ORDER BY created_at DESC');
  return result.rows;
});

// Upload a new image
server.post('/api/images', async (req, reply) => {
  const part = await req.file();
  if (!part) return reply.status(400).send({ error: 'No file uploaded' });

  if (!ALLOWED_MIME_TYPES.has(part.mimetype)) {
    // Consume the stream to avoid memory leaks
    part.file.resume();
    return reply.status(400).send({ error: 'Unsupported file type. Allowed: png, jpg, gif, webp' });
  }

  const ext = MIME_TO_EXT[part.mimetype];
  const filename = `${randomUUID()}${ext}`;

  const chunks: Buffer[] = [];
  for await (const chunk of part.file) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  await storage.save(filename, buffer);

  const result = await pool.query(
    'INSERT INTO images (filename, original_name, mime_type, size_bytes) VALUES ($1, $2, $3, $4) RETURNING *',
    [filename, part.filename, part.mimetype, buffer.length],
  );

  return reply.status(201).send(result.rows[0]);
});

// Delete an image
server.delete<{ Params: { id: string } }>('/api/images/:id', async (req, reply) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM images WHERE id = $1 RETURNING filename', [id]);
  if (result.rows.length === 0) return reply.status(404).send({ error: 'Image not found' });

  await storage.delete(result.rows[0].filename);
  return reply.status(204).send();
});

// List all scenes (id, name, label only — no full data)
server.get<{ Querystring: { projectId?: string } }>('/api/scenes', async (req) => {
  const { projectId } = req.query;
  if (projectId) {
    const result = await pool.query(
      'SELECT id, name, label FROM scenes WHERE project_id = $1 ORDER BY label ASC',
      [projectId],
    );
    return result.rows;
  }
  const result = await pool.query(
    'SELECT id, name, label FROM scenes ORDER BY label ASC'
  );
  return result.rows;
});

// Get a single scene by UUID
server.get<{ Params: { id: string } }>('/api/scenes/id/:id', async (req, reply) => {
  const result = await pool.query(
    'SELECT id, name, label FROM scenes WHERE id = $1',
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return reply.status(404).send({ error: 'Scene not found' });
  }
  return result.rows[0];
});

// Get a single scene's full data
server.get<{ Params: { name: string } }>('/api/scenes/:name', async (req, reply) => {
  const result = await pool.query(
    'SELECT * FROM scenes WHERE name = $1',
    [req.params.name]
  );
  if (result.rows.length === 0) {
    return reply.status(404).send({ error: 'Scene not found' });
  }
  return result.rows[0];
});

// Create a new scene
server.post<{ Body: { name: string; label: string; data: unknown } }>('/api/scenes', async (req, reply) => {
  const { name, label, data } = req.body;
  const result = await pool.query(
    'INSERT INTO scenes (name, label, data) VALUES ($1, $2, $3) RETURNING *',
    [name, label, data]
  );
  return reply.status(201).send(result.rows[0]);
});

// Upsert a scene — updates if name exists, creates if not
server.put<{ Params: { name: string }; Body: { label: string; data: unknown } }>('/api/scenes/:name', async (req, reply) => {
  const { name } = req.params;
  const { label, data } = req.body;
  const result = await pool.query(
    `INSERT INTO scenes (name, label, data)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE SET label = EXCLUDED.label, data = EXCLUDED.data
     RETURNING *`,
    [name, label, data]
  );
  return result.rows[0];
});

// Save or overwrite a scene thumbnail
server.put<{ Params: { name: string }; Body: { dataUrl: string } }>('/api/scenes/:name/thumbnail', async (req, reply) => {
  const { name } = req.params;
  const { dataUrl } = req.body;
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/);
  if (!match) return reply.status(400).send({ error: 'Invalid dataUrl' });
  const buffer = Buffer.from(match[2], 'base64');
  await thumbnailStorage.save(`${name}.jpg`, buffer);
  return reply.status(204).send();
});

// Delete a scene
server.delete<{ Params: { name: string } }>('/api/scenes/:name', async (req, reply) => {
  const result = await pool.query(
    'DELETE FROM scenes WHERE name = $1 RETURNING id',
    [req.params.name]
  );
  if (result.rows.length === 0) {
    return reply.status(404).send({ error: 'Scene not found' });
  }
  return reply.status(204).send();
});

// SPA catch-all: serve index.html for /project/* (covers /project/:id and /project/:id/scene/:sceneId)
server.get('/project/*', (req, reply) => {
  reply.sendFile('index.html', path.join(__dirname, '../../frontend/public'));
});

// Start server
const start = async () => {
  try {
    await runMigrations();
    await storage.init();
    await thumbnailStorage.init();

    // Register plugins
    await server.register(cors, {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
    });

    await server.register(multipart, {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    });

    await server.register(staticFiles, {
      root: path.join(__dirname, '../../frontend/public'),
    });

    await server.register(staticFiles, {
      root: uploadsDir,
      prefix: '/uploads/',
      decorateReply: false,
    });

    await server.register(staticFiles, {
      root: thumbnailsDir,
      prefix: '/thumbnails/',
      decorateReply: false,
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
