import { incrementProjectVersion } from '../projects';
import { attachSceneThumbnailUrls } from '../thumbnails';
import {
  deleteSceneRecordById,
  insertScene,
  selectSceneById,
  selectSceneSummaries,
  updateSceneRecord,
} from './sceneRepository';

export async function listScenes(projectId?: string) {
  return attachSceneThumbnailUrls(await selectSceneSummaries(projectId));
}

export async function getSceneById(id: string) {
  return selectSceneById(id);
}

export async function createScene(input: {
  name: string;
  label: string;
  data: unknown;
  projectId?: string;
}) {
  return insertScene(input);
}

export async function saveSceneById(id: string, label: string, data: unknown) {
  const scene = await updateSceneRecord(id, label, data);
  if (!scene) return null;

  if (scene.project_id) {
    await incrementProjectVersion(scene.project_id);
  }

  return scene;
}

export async function deleteSceneById(id: string) {
  const deleted = await deleteSceneRecordById(id);

  if (deleted?.project_id) {
    await incrementProjectVersion(deleted.project_id);
  }

  return deleted;
}
