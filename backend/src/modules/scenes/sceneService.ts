import type { Scene } from '@livewallpaper/types';
import { pool } from '../../db';
import { incrementProjectVersion } from '../projects';
import { attachSceneThumbnailUrls } from '../thumbnails';
import {
  deleteSceneRecordById,
  insertScene,
  selectSceneById,
  selectSceneSummaries,
  updateScene,
} from './sceneRepository';
import { replaceSpritesForScene } from '../sprites/spriteRepository';

export async function listScenes(projectId?: string) {
  return attachSceneThumbnailUrls(await selectSceneSummaries(projectId));
}

export async function getSceneById(id: string) {
  return selectSceneById(id);
}

export async function createScene(input: {
  name: string;
  label: string;
  data: Scene;
  projectId?: string;
}) {
  const client = await pool.connect();
  let sceneId: string;
  try {
    await client.query('BEGIN');
    const { id } = await insertScene(client, input);
    sceneId = id;
    await replaceSpritesForScene(client, sceneId, input.data.sprites);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (input.projectId) {
    await incrementProjectVersion(input.projectId);
  }

  return selectSceneById(sceneId);
}

export async function saveSceneById(id: string, label: string, data: Scene) {
  const client = await pool.connect();
  let projectId: string | null = null;
  try {
    await client.query('BEGIN');
    const row = await updateScene(client, id, label, data);
    if (!row) {
      await client.query('ROLLBACK');
      return null;
    }
    projectId = row.project_id;
    await replaceSpritesForScene(client, id, data.sprites);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  if (projectId) {
    await incrementProjectVersion(projectId);
  }

  return selectSceneById(id);
}

export async function deleteSceneById(id: string) {
  const deleted = await deleteSceneRecordById(id);

  if (deleted?.project_id) {
    await incrementProjectVersion(deleted.project_id);
  }

  return deleted;
}
