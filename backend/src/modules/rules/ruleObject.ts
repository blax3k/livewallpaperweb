import type { RuleAction, RuleConditionGroup, RuleDefinition, RuleGroup } from '@livewallpaper/types';

export class RuleObject {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly oneShot: boolean,
    public readonly group: string | null,
    public readonly conditions: RuleConditionGroup[],
    public readonly actions: RuleAction[],
  ) {}

  toRuleDefinition(): RuleDefinition {
    return {
      id: this.id,
      name: this.name,
      ...(this.group ? { group: this.group } : {}),
      ...(this.conditions.length > 0 ? { conditions: this.conditions } : {}),
      actions: this.actions,
      oneShot: this.oneShot,
    };
  }
}

type RuleGroupRow = {
  id: string;
  name: string;
};

export class RuleGroupObject {
  constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  static fromRow(row: RuleGroupRow): RuleGroupObject {
    return new RuleGroupObject(row.id, row.name);
  }

  toRuleGroup(): RuleGroup {
    return { id: this.id, name: this.name };
  }
}
