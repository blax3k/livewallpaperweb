import type { RuleDefinition, RuleGroup } from '@livewallpaper/types';
import {
  deleteRuleGroupById,
  insertRuleGroup,
  projectExists,
  replaceRulesForProject,
  selectRuleGroupsForProject,
  selectRulesForProject,
  updateRuleGroupName,
} from './ruleRepository';

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === '23505';
}

export async function getRules(projectId: string): Promise<RuleDefinition[]> {
  const rules = await selectRulesForProject(projectId);
  return rules.map(r => r.toRuleDefinition());
}

export async function saveRules(projectId: string, rules: RuleDefinition[]): Promise<boolean> {
  return replaceRulesForProject(projectId, rules);
}

export async function getRuleGroups(projectId: string): Promise<RuleGroup[] | null> {
  if (!(await projectExists(projectId))) return null;
  const groups = await selectRuleGroupsForProject(projectId);
  return groups.map(g => g.toRuleGroup());
}

export async function createRuleGroup(projectId: string, name: string): Promise<RuleGroup | null> {
  if (!(await projectExists(projectId))) return null;
  try {
    return (await insertRuleGroup(projectId, name)).toRuleGroup();
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw Object.assign(new Error(`Group "${name}" already exists`), { code: 'GROUP_NAME_TAKEN' });
    }
    throw err;
  }
}

export async function renameRuleGroup(projectId: string, groupId: string, name: string): Promise<RuleGroup | null> {
  try {
    const updated = await updateRuleGroupName(projectId, groupId, name);
    return updated ? updated.toRuleGroup() : null;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw Object.assign(new Error(`Group "${name}" already exists`), { code: 'GROUP_NAME_TAKEN' });
    }
    throw err;
  }
}

export async function deleteRuleGroup(projectId: string, groupId: string): Promise<boolean> {
  return deleteRuleGroupById(projectId, groupId);
}
