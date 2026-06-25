import type { SceneSummary, SceneDetail, ProjectSummary, ImageRecord, FlagDefinition, RuleDefinition } from '@livewallpaper/types';

export type { SceneSummary, SceneDetail, ProjectSummary, ImageRecord, FlagDefinition, RuleDefinition };

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly data?: unknown) {
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
    let body: unknown;
    try {
      body = await res.json();
      message = (body as Record<string, string>).error ?? (body as Record<string, string>).message ?? message;
    } catch {}
    throw new ApiError(res.status, message, body);
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

  create(name: string, label: string, data: object, projectId?: string, copyFromSceneId?: string): Promise<SceneSummary> {
    return request<SceneSummary>('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, label, data, ...(projectId && { projectId }), ...(copyFromSceneId && { copyFromSceneId }) }),
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

  delete(sceneId: string): Promise<void> {
    return request<void>(`/api/scenes/${sceneId}`, { method: 'DELETE' });
  },
};

export const projectsApi = {
  list(): Promise<ProjectSummary[]> {
    return request<ProjectSummary[]>('/api/projects');
  },

  get(projectId: string): Promise<ProjectSummary> {
    return request<ProjectSummary>(`/api/projects/${encodeURIComponent(projectId)}`);
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
  list(projectId: string): Promise<ImageRecord[]> {
    return request<ImageRecord[]>(`/api/images/${projectId}`);
  },

  upload(projectId: string, file: File): Promise<ImageRecord> {
    const form = new FormData();
    form.append('file', file);
    return request<ImageRecord>(`/api/images?projectId=${encodeURIComponent(projectId)}`, { method: 'POST', body: form });
  },

  checkUsage(imageId: string): Promise<{ scenes: string[] }> {
    return request<{ scenes: string[] }>(`/api/images/${imageId}/usage`);
  },

  delete(imageId: string): Promise<void> {
    return request<void>(`/api/images/${imageId}`, { method: 'DELETE' });
  },

  getSizesByFilenames(filenames: string[]): Promise<Record<string, number>> {
    return request<Record<string, number>>('/api/images/by-filenames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames }),
    });
  },
};

export const flagsApi = {
  list(projectId: string): Promise<FlagDefinition[]> {
    return request<FlagDefinition[]>(`/api/projects/${projectId}/flags`);
  },

  save(projectId: string, flags: FlagDefinition[]): Promise<void> {
    return request<void>(`/api/projects/${projectId}/flags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flags),
    });
  },

  checkUsage(projectId: string, flagId: string): Promise<{ scenes: string[]; rules: string[] }> {
    return request<{ scenes: string[]; rules: string[] }>(`/api/projects/${projectId}/flags/${flagId}/usage`);
  },
};

export const rulesApi = {
  list(projectId: string): Promise<RuleDefinition[]> {
    return request<RuleDefinition[]>(`/api/projects/${projectId}/rules`);
  },

  save(projectId: string, rules: RuleDefinition[]): Promise<void> {
    return request<void>(`/api/projects/${projectId}/rules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules),
    });
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
