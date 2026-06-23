import { ObjectModel, type ObjectStatus } from '../common/objectModel';

type ProjectSummaryRow = {
  id: string;
  name: string;
  version: number;
  status: ObjectStatus;
  created_at?: string;
  updated_at?: string;
  scene_ids: string[] | null;
  total_size_bytes?: number;
};

export class ProjectObject extends ObjectModel {
  constructor(
    id: string,
    public readonly name: string,
    public readonly version: number,
    status: ObjectStatus,
    created_at?: string,
    updated_at?: string,
    public readonly scene_ids: string[] = [],
    public readonly total_size_bytes: number = 0,
  ) {
    super(id, status, created_at, updated_at);
  }

  static fromSummaryRow(row: ProjectSummaryRow): ProjectObject {
    return new ProjectObject(
      row.id,
      row.name,
      row.version,
      row.status,
      row.created_at,
      row.updated_at,
      row.scene_ids ?? [],
      row.total_size_bytes ?? 0,
    );
  }

}
