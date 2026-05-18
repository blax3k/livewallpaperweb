import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';

export interface ImageStorage {
  init(): Promise<void>;
  save(filename: string, buffer: Buffer): Promise<void>;
  delete(filename: string): Promise<void>;
  getUrl(filename: string): string;
}

export class LocalStorage implements ImageStorage {
  constructor(private readonly dir: string) {}

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async save(filename: string, buffer: Buffer): Promise<void> {
    await writeFile(path.join(this.dir, filename), buffer);
  }

  async delete(filename: string): Promise<void> {
    await unlink(path.join(this.dir, filename));
  }

  getUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}
