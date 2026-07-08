import type { FlagDefinition, FlagGroup } from '@livewallpaper/types';

type FlagRow = {
  id: string;
  name: string;
  default_active: boolean;
  group_name: string | null;
  is_chapter: boolean;
  chapter_order: number | null;
};

export class FlagObject {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly defaultActive: boolean,
    public readonly group: string | null = null,
    public readonly isChapter: boolean = false,
    public readonly chapterOrder: number | null = null,
  ) {}

  static fromRow(row: FlagRow): FlagObject {
    return new FlagObject(row.id, row.name, row.default_active, row.group_name, row.is_chapter, row.chapter_order);
  }

  toFlagDefinition(): FlagDefinition {
    return {
      id: this.id,
      name: this.name,
      defaultActive: this.defaultActive,
      ...(this.group ? { group: this.group } : {}),
      ...(this.isChapter ? { isChapter: true, chapterOrder: this.chapterOrder ?? undefined } : {}),
    };
  }
}

type FlagGroupRow = {
  id: string;
  name: string;
};

export class FlagGroupObject {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  static fromRow(row: FlagGroupRow): FlagGroupObject {
    return new FlagGroupObject(row.id, row.name);
  }

  toFlagGroup(): FlagGroup {
    return { id: this.id, name: this.name };
  }
}
