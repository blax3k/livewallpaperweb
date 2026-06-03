export type ObjectStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export interface Sprite {
  height: number;
  name: string;
  parallaxMultiplier: number;
  positionX: number;
  positionY: number;
  texCoordinates: number[];
  textureResource: string;
  textureResourceId: number;
  width: number;
}

export interface Scene {
  sprites: Sprite[];
  xFocus: number;
  /** Start time as minutes-of-day (0–1439) when this scene becomes available. Defaults to 0 (00:00). */
  startTime?: number;
  /** End time as minutes-of-day (0–1439) until which this scene is available. Defaults to 1439 (23:59). */
  endTime?: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  version: number;
  status: ObjectStatus;
  created_at?: string;
  updated_at?: string;
  scene_names: string[];
  scene_thumbnail_urls: string[];
}

export interface SceneSummary {
  id: string;
  name: string;
  label: string;
  status: ObjectStatus;
  thumbnail_url: string;
}

export interface SceneDetail {
  id: string;
  name: string;
  label: string;
  status: ObjectStatus;
  data: Scene;
  project_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ImageRecord {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}
