import { ObjectModel, type ObjectStatus } from '../common/objectModel';

type ProjectSummaryRow = {
  id: string;
  name: string;
  version: number;
  status: ObjectStatus;
  created_at?: string;
  updated_at?: string;
  scene_names: string[] | null;
};

type CreatedProjectRow = {
  id: string;
  name: string;
  status: ObjectStatus;
  created_at?: string;
  updated_at?: string;
};

export class ProjectObject extends ObjectModel {
  constructor(
    id: string,
    public readonly name: string,
    public readonly version: number,
    status: ObjectStatus,
    created_at?: string,
    updated_at?: string,
    public readonly scene_names: string[] = [],
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
      row.scene_names ?? [],
    );
  }

  static fromCreatedRow(row: CreatedProjectRow): ProjectObject {
    return new ProjectObject(row.id, row.name, 1, row.status, row.created_at, row.updated_at, []);
  }
}