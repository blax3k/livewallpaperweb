import type { ImageStorage } from '../../storage';

export function getSceneThumbnailUrl(sceneId: string) {
  return `/thumbnails/${sceneId}.jpg`;
}

export function attachSceneThumbnailUrl<T extends { id: string }>(scene: T) {
  return {
    ...scene,
    thumbnail_url: getSceneThumbnailUrl(scene.id),
  };
}

export function attachSceneThumbnailUrls<T extends { id: string }>(scenes: T[]) {
  return scenes.map(attachSceneThumbnailUrl);
}

export function attachProjectThumbnailUrls<T extends { scene_ids?: string[] | null }>(project: T) {
  return {
    ...project,
    scene_thumbnail_urls: (project.scene_ids ?? []).map(getSceneThumbnailUrl),
  };
}

export function attachProjectsThumbnailUrls<T extends { scene_ids?: string[] | null }>(projects: T[]) {
  return projects.map(attachProjectThumbnailUrls);
}

export async function saveSceneThumbnail(
  sceneId: string,
  dataUrl: string,
  thumbnailStorage: ImageStorage,
) {
  const match = dataUrl.match(/^data:image\/(jpeg|jpg);base64,(.+)$/);
  if (!match) {
    return false;
  }

  const buffer = Buffer.from(match[2], 'base64');
  await thumbnailStorage.save(`${sceneId}.jpg`, buffer);
  return true;
}
