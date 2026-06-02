import { insertProject, selectProjects } from './projectRepository';

export async function listProjects() {
  return selectProjects();
}

export async function createProject(name: string) {
  return insertProject(name);
}
