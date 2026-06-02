import 'dotenv/config';
import path from 'path';
import { runMigrations } from './db/migrations';
import { LocalStorage } from './storage';
import { buildServer } from './app';

const uploadsDir = path.join(__dirname, '../data/uploads');
const storage = new LocalStorage(uploadsDir);

const thumbnailsDir = path.join(__dirname, '../data/thumbnails');
const thumbnailStorage = new LocalStorage(thumbnailsDir);
// Start server
const start = async () => {
  try {
    console.log('[storage] uploadsDir:', uploadsDir);
    console.log('[storage] thumbnailsDir:', thumbnailsDir);
    await runMigrations();
    await storage.init();
    await thumbnailStorage.init();

    const server = await buildServer({
      uploadsDir,
      thumbnailsDir,
      imageStorage: storage,
      thumbnailStorage,
    });

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST ?? '0.0.0.0';
    await server.listen({ port, host });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
