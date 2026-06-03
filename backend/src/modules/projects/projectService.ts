import { insertProject, selectProjects } from './projectRepository';
import { attachProjectsThumbnailUrls } from '../thumbnails';

export async function listProjects() {
  return attachProjectsThumbnailUrls(await selectProjects());
}

export async function createProject(name: string) {
  return insertProject(name);
}
