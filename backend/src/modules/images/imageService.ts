import type { MultipartFile } from '@fastify/multipart';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import type { ImageStorage } from '../../storage';
import { deleteImageRecordById, insertImageRecord, selectImageById, selectImages, selectImageSizesByFilenames, selectScenesUsingImage, updateImageRecord } from './imageRepository';
import { HttpStatus } from '../../utils/httpStatus';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

export class ImageUploadError extends Error {
  constructor(public readonly statusCode: number, public readonly payload: { error: string }) {
    super(payload.error);
  }
}

export class ImageInUseError extends Error {
  constructor(public readonly scenes: string[]) {
    super('Image is in use');
  }
}

async function buildImageUpload(part?: MultipartFile) {
  if (!part) {
    throw new ImageUploadError(HttpStatus.BAD_REQUEST, { error: 'No file uploaded' });
  }

  if (!ALLOWED_MIME_TYPES.has(part.mimetype)) {
    part.file.resume();
    throw new ImageUploadError(HttpStatus.BAD_REQUEST, {
      error: 'Unsupported file type. Allowed: png, jpg, gif, webp',
    });
  }

  const ext = MIME_TO_EXT[part.mimetype];
  const filename = `${randomUUID()}${ext}`;

  const chunks: Buffer[] = [];
  for await (const chunk of part.file) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (part.file.truncated) {
    throw new ImageUploadError(HttpStatus.PAYLOAD_TOO_LARGE, { error: 'File too large. Maximum size is 100MB.' });
  }

  const buffer = Buffer.concat(chunks);

  return {
    filename,
    originalName: part.filename,
    mimeType: part.mimetype,
    sizeBytes: buffer.length,
    buffer,
  };
}

export async function listImages(projectId: string) {
  return selectImages(projectId);
}

async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).resize(256, 256, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

export async function uploadImage(projectId: string | undefined, part: MultipartFile | undefined, storage: ImageStorage, thumbnailStorage: ImageStorage) {
  const upload = await buildImageUpload(part);
  await storage.save(upload.filename, upload.buffer);

  let thumbFilename: string | null = null;
  try {
    const thumbBuffer = await generateThumbnail(upload.buffer);
    thumbFilename = `${randomUUID()}.jpg`;
    await thumbnailStorage.save(thumbFilename, thumbBuffer);
  } catch {
    // thumbnail generation is best-effort; proceed without it
  }

  try {
    return await insertImageRecord({
      filename: upload.filename,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      projectId: projectId,
      thumbFilename,
    });
  } catch (err) {
    await storage.delete(upload.filename);
    if (thumbFilename) await thumbnailStorage.delete(thumbFilename);
    throw err;
  }
}


export async function replaceImage(imageId: string, projectId: string | undefined, part: MultipartFile | undefined, storage: ImageStorage, thumbnailStorage: ImageStorage) {
  const originalImage = await selectImageById(imageId);
  if(!originalImage)
  {
    throw Error('image' + imageId + ' does not exist');
  }
  const upload = await buildImageUpload(part);
  await storage.save(upload.filename, upload.buffer);

  let thumbFilename: string | null = null;
  try {
    const thumbBuffer = await generateThumbnail(upload.buffer);
    thumbFilename = `${randomUUID()}.jpg`;
    await thumbnailStorage.save(thumbFilename, thumbBuffer);
  } catch {
    // thumbnail generation is best-effort; proceed without it
  }

  try {
    const imageRecord = await updateImageRecord(imageId, {
      filename: upload.filename,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
      projectId: projectId,
      thumbFilename,
    });

    await storage.delete(originalImage.filename);
    if (originalImage.thumb_filename) await thumbnailStorage.delete(originalImage.thumb_filename);

    return imageRecord;
  } catch (err) {
    await storage.delete(upload.filename);
    if (thumbFilename) await thumbnailStorage.delete(thumbFilename);
    throw err;
  }
}

export async function getImageSizesByFilenames(filenames: string[]) {
  return selectImageSizesByFilenames(filenames);
}

export async function checkImageUsage(id: string): Promise<string[]> {
  return selectScenesUsingImage(id);
}

export async function deleteImage(id: string, storage: ImageStorage, thumbnailStorage: ImageStorage) {
  const scenes = await selectScenesUsingImage(id);
  if (scenes.length > 0) {
    throw new ImageInUseError(scenes);
  }

  const deleted = await deleteImageRecordById(id);
  if (!deleted) {
    return null;
  }

  await storage.delete(String(deleted.filename));
  if (deleted.thumb_filename) await thumbnailStorage.delete(String(deleted.thumb_filename));
  return deleted;
}
