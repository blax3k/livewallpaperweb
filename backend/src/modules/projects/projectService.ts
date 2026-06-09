import { insertProject, selectProjects, setProjectStatus } from './projectRepository';
import { attachProjectThumbnailUrls, attachProjectsThumbnailUrls } from '../thumbnails';

export async function listProjects(opts: { activeOnly?: boolean } = {}) {
  return attachProjectsThumbnailUrls(await selectProjects(opts));
}

export async function createProject(name: string) {
  return insertProject(name);
}

export async function archiveProject(projectId: string) {
  const project = await setProjectStatus(projectId, 'ARCHIVED');
  return project ? attachProjectThumbnailUrls(project) : null;
}

export async function unarchiveProject(projectId: string) {
  const project = await setProjectStatus(projectId, 'ACTIVE');
  return project ? attachProjectThumbnailUrls(project) : null;
}
