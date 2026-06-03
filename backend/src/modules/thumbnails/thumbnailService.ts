import type { ImageStorage } from '../../storage';

export function getSceneThumbnailUrl(sceneName: string) {
  return `/thumbnails/${sceneName}.jpg`;
}

export function attachSceneThumbnailUrl<T extends { name: string }>(scene: T) {
  return {
    ...scene,
    thumbnail_url: getSceneThumbnailUrl(scene.name),
  };
}

export function attachSceneThumbnailUrls<T extends { name: string }>(scenes: T[]) {
  return scenes.map(attachSceneThumbnailUrl);
}

export function attachProjectThumbnailUrls<T extends { scene_names?: string[] | null }>(project: T) {
  return {
    ...project,
    scene_thumbnail_urls: (project.scene_names ?? []).map(getSceneThumbnailUrl),
  };
}

export function attachProjectsThumbnailUrls<T extends { scene_names?: string[] | null }>(projects: T[]) {
  return projects.map(attachProjectThumbnailUrls);
}

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
