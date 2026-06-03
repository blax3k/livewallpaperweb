import type { ImageStorage } from '../../storage';

export async function saveSceneThumbnail(
  sceneName: string,
  dataUrl: string,
  thumbnailStorage: ImageStorage,
) {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg);base64,(.+)$/);
  if (!match) {
    return false;
  }

  const buffer = Buffer.from(match[2], 'base64');
  await thumbnailStorage.save(`${sceneName}.jpg`, buffer);
  return true;
}
