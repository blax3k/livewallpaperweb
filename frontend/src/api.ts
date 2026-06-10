import type { SceneSummary, SceneDetail, ProjectSummary, ImageRecord } from '@livewallpaper/types';

export type { SceneSummary, SceneDetail, ProjectSummary, ImageRecord };

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.error ?? body.message ?? message;
    } catch {}
    throw new ApiError(res.status, message);
  }
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return undefined as T;
}

export const scenesApi = {
  list(projectId?: string): Promise<SceneSummary[]> {
    const url = projectId
      ? `/api/scenes?projectId=${encodeURIComponent(projectId)}`
      : '/api/scenes';
    return request<SceneSummary[]>(url);
  },

  get(sceneId: string): Promise<SceneDetail> {
    return request<SceneDetail>(`/api/scenes/${sceneId}`);
  },

  create(name: string, label: string, data: object, projectId?: string): Promise<SceneSummary> {
    return request<SceneSummary>('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, label, data, ...(projectId && { projectId }) }),
    });
  },

  update(sceneId: string, label: string, data: object): Promise<void> {
    return request<void>(`/api/scenes/${sceneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, data }),
    });
  },

  updateThumbnail(sceneId: string, dataUrl: string): Promise<void> {
    return request<void>(`/api/scenes/${sceneId}/thumbnail`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    });
  },
};

export const projectsApi = {
  list(): Promise<ProjectSummary[]> {
    return request<ProjectSummary[]>('/api/projects');
  },

  create(name: string): Promise<ProjectSummary> {
    return request<ProjectSummary>('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  },

  archive(projectId: string): Promise<ProjectSummary> {
    return request<ProjectSummary>(`/api/projects/${projectId}/archive`, { method: 'PATCH' });
  },

  unarchive(projectId: string): Promise<ProjectSummary> {
    return request<ProjectSummary>(`/api/projects/${projectId}/unarchive`, { method: 'PATCH' });
  },
};

export const imagesApi = {
  list(): Promise<ImageRecord[]> {
    return request<ImageRecord[]>('/api/images');
  },

  upload(file: File): Promise<ImageRecord> {
    const form = new FormData();
    form.append('file', file);
    return request<ImageRecord>('/api/images', { method: 'POST', body: form });
  },

  delete(imageId: string): Promise<void> {
    return request<void>(`/api/images/${imageId}`, { method: 'DELETE' });
  },
};

export const spritesApi = {
  rename(spriteId: string, name: string): Promise<void> {
    return request<void>(`/api/sprites/${spriteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  },
};

export const authApi = {
  me(): Promise<{ id: string; email: string }> {
    return request<{ id: string; email: string }>('/api/auth/me');
  },

  login(email: string, password: string): Promise<{ id: string; email: string }> {
    return request<{ id: string; email: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },

  register(email: string, password: string): Promise<{ id: string; email: string }> {
    return request<{ id: string; email: string }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  },

  logout(): Promise<void> {
    return request<void>('/api/auth/logout', { method: 'POST' });
  },
};
