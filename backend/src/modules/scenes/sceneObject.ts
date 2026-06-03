import type { Scene } from '@livewallpaper/types';
import { ObjectModel, type ObjectStatus } from '../common/objectModel';

type SceneSummaryRow = {
  id: string;
  name: string;
  label: string;
  status: ObjectStatus;
};

type SceneRow = SceneSummaryRow & {
  scene: Scene;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

export class SceneObject extends ObjectModel {
  constructor(
    id: string,
    public readonly name: string,
    public readonly label: string,
    status: ObjectStatus,
    created_at?: string,
    updated_at?: string,
    public readonly data?: Scene,
    public readonly project_id?: string | null,
  ) {
    super(id, status, created_at, updated_at);
  }

  static fromSummaryRow(row: SceneSummaryRow): SceneObject {
    return new SceneObject(row.id, row.name, row.label, row.status);
  }

  static fromRow(row: SceneRow): SceneObject {
    return new SceneObject(
      row.id,
      row.name,
      row.label,
      row.status,
      row.created_at,
      row.updated_at,
      row.scene,
      row.project_id,
    );
  }
}