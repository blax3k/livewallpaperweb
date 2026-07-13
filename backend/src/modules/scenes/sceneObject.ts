import type { Scene, SceneFlagDeclarations, SceneSlot } from '@livewallpaper/types';
import { ObjectModel, type ObjectStatus } from '../common/objectModel';
import { SpriteObject } from '../sprites/spriteObject';

type SceneSummaryRow = {
  id: string;
  name: string;
  label: string;
  status: ObjectStatus;
  updated_at: string;
  flag_declarations: SceneFlagDeclarations | null;
};

type SceneRow = SceneSummaryRow & {
  x_focus: number;
  y_focus: number;
  slots: SceneSlot[] | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  sprites: SpriteObject[];
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
    // Lightweight selection metadata, surfaced on summary rows (no sprites required).
    public readonly flags?: SceneFlagDeclarations,
  ) {
    super(id, status, created_at, updated_at);
  }

  static fromSummaryRow(row: SceneSummaryRow): SceneObject {
    return new SceneObject(
      row.id,
      row.name,
      row.label,
      row.status,
      undefined,
      row.updated_at,
      undefined,
      undefined,
      row.flag_declarations ?? undefined,
    );
  }

  static fromRow(row: SceneRow): SceneObject {
    const data: Scene = {
      xFocus: row.x_focus,
      yFocus: row.y_focus,
      ...(row.flag_declarations != null && { flags: row.flag_declarations }),
      ...(row.slots != null && { slots: row.slots }),
      sprites: row.sprites.map(s => s.toSprite()),
    };
    return new SceneObject(
      row.id,
      row.name,
      row.label,
      row.status,
      row.created_at,
      row.updated_at,
      data,
      row.project_id,
    );
  }
}
