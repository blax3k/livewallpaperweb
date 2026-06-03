import type { ObjectStatus } from '@livewallpaper/types';
export type { ObjectStatus } from '@livewallpaper/types';

export abstract class ObjectModel {
  protected constructor(
    public readonly id: string,
    public readonly status: ObjectStatus = 'ACTIVE',
    public readonly created_at?: string,
    public readonly updated_at?: string,
  ) {}
}