import type { Scene } from '../interfaces/Scene';

export interface SceneSizeBreakdown {
  jsonBytes: number;
  imageBytes: number;
  totalBytes: number;
}

export function collectTextureResources(scene: Scene): Set<string> {
  const resources = new Set<string>();
  for (const sprite of scene.sprites) {
    resources.add(sprite.textureResource);
    for (const block of sprite.conditions ?? []) {
      for (const mod of block.modifications ?? []) {
        if (mod.type === 'texture' && mod.textureResource) {
          resources.add(mod.textureResource);
        }
      }
    }
  }
  return resources;
}

export function computeSceneSize(scene: Scene, sizesByFilename: Record<string, number>): SceneSizeBreakdown {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(scene)).length;

  const resources = collectTextureResources(scene);
  let imageBytes = 0;
  for (const resource of resources) {
    if (!resource.startsWith('/uploads/')) continue;
    const filename = resource.slice('/uploads/'.length);
    imageBytes += sizesByFilename[filename] ?? 0;
  }

  return { jsonBytes, imageBytes, totalBytes: jsonBytes + imageBytes };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
