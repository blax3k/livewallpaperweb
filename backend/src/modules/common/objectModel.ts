export const OBJECT_STATUSES = ['ACTIVE', 'ARCHIVED', 'DELETED'] as const;

export type ObjectStatus = (typeof OBJECT_STATUSES)[number];

export abstract class ObjectModel {
  protected constructor(
    public readonly id: string,
    public readonly status: ObjectStatus = 'ACTIVE',
    public readonly created_at?: string,
    public readonly updated_at?: string,
  ) {}
}