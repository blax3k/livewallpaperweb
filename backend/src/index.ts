import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import path from 'path';
import { pool } from './db';
import { runMigrations } from './db/migrations';

const server = Fastify({
  logger: true,
});

// Health check
server.get('/health', async () => {
  return { status: 'ok' };
});

// List all scenes (id, name, label only — no full data)
server.get('/api/scenes', async () => {
  const result = await pool.query(
    'SELECT id, name, label FROM scenes ORDER BY label ASC'
  );
  return result.rows;
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

// Update an existing scene
server.put<{ Params: { name: string }; Body: { label?: string; data?: unknown } }>('/api/scenes/:name', async (req, reply) => {
  const { name } = req.params;
  const { label, data } = req.body;
  const result = await pool.query(
    `UPDATE scenes
     SET label = COALESCE($1, label),
         data  = COALESCE($2, data)
     WHERE name = $3
     RETURNING *`,
    [label ?? null, data ?? null, name]
  );
  if (result.rows.length === 0) {
    return reply.status(404).send({ error: 'Scene not found' });
  }
  return result.rows[0];
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

// Start server
const start = async () => {
  try {
    await runMigrations();

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
