import { incrementProjectVersion } from '../projects';
import {
  deleteSceneRecordByName,
  insertScene,
  selectSceneByName,
  selectSceneSummaries,
  selectSceneSummaryById,
  upsertSceneRecord,
} from './sceneRepository';

export async function listScenes(projectId?: string) {
  return selectSceneSummaries(projectId);
}

export async function getSceneSummaryById(id: string) {
  return selectSceneSummaryById(id);
}

export async function getSceneByName(name: string) {
  return selectSceneByName(name);
}

export async function createScene(input: {
  name: string;
  label: string;
  data: unknown;
  projectId?: string;
}) {
  return insertScene(input);
}

export async function saveSceneByName(name: string, label: string, data: unknown) {
  const scene = await upsertSceneRecord(name, label, data);

  if (scene.project_id) {
    await incrementProjectVersion(scene.project_id);
  }

  return scene;
}

export async function deleteSceneByName(name: string) {
  const deleted = await deleteSceneRecordByName(name);

  if (deleted?.project_id) {
    await incrementProjectVersion(deleted.project_id);
  }

  return deleted;
}
