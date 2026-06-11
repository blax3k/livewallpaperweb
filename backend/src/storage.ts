import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import path from 'path';

export interface ImageStorage {
  init(): Promise<void>;
  read(filename: string): Promise<Buffer | null>;
  save(filename: string, buffer: Buffer): Promise<void>;
  delete(filename: string): Promise<void>;
  getUrl(filename: string): string;
}

export class LocalStorage implements ImageStorage {
  constructor(private readonly dir: string) {}

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async read(filename: string): Promise<Buffer | null> {
    try {
      return await readFile(path.join(this.dir, filename));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async save(filename: string, buffer: Buffer): Promise<void> {
    await writeFile(path.join(this.dir, filename), buffer);
  }

  async delete(filename: string): Promise<void> {
    try {
      await unlink(path.join(this.dir, filename));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  getUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}
