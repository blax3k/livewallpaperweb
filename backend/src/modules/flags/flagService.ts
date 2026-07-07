import type { FlagDefinition, FlagGroup } from '@livewallpaper/types';
import {
  deleteFlagGroupById,
  insertFlagGroup,
  projectExists,
  replaceFlagsForProject,
  selectFlagGroupsForProject,
  selectFlagsForProject,
  selectFlagUsage,
  selectFlagUsageCounts,
  updateFlagGroupName,
} from './flagRepository';

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === '23505';
}

export async function getFlags(projectId: string): Promise<FlagDefinition[]> {
  const flags = await selectFlagsForProject(projectId);
  return flags.map(f => f.toFlagDefinition());
}

export async function saveFlags(projectId: string, flags: FlagDefinition[]): Promise<boolean> {
  return replaceFlagsForProject(projectId, flags);
}

export async function getFlagUsage(projectId: string, flagId: string): Promise<{ scenes: string[]; rules: string[] }> {
  return selectFlagUsage(projectId, flagId);
}

export async function getFlagUsageCounts(projectId: string): Promise<Record<string, { rules: number; scenes: number }>> {
  return selectFlagUsageCounts(projectId);
}

export async function getFlagGroups(projectId: string): Promise<FlagGroup[] | null> {
  if (!(await projectExists(projectId))) return null;
  const groups = await selectFlagGroupsForProject(projectId);
  return groups.map(g => g.toFlagGroup());
}

export async function createFlagGroup(projectId: string, name: string): Promise<FlagGroup | null> {
  if (!(await projectExists(projectId))) return null;
  try {
    return (await insertFlagGroup(projectId, name)).toFlagGroup();
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw Object.assign(new Error(`Group "${name}" already exists`), { code: 'GROUP_NAME_TAKEN' });
    }
    throw err;
  }
}

export async function renameFlagGroup(projectId: string, groupId: string, name: string): Promise<FlagGroup | null> {
  try {
    const updated = await updateFlagGroupName(projectId, groupId, name);
    return updated ? updated.toFlagGroup() : null;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw Object.assign(new Error(`Group "${name}" already exists`), { code: 'GROUP_NAME_TAKEN' });
    }
    throw err;
  }
}

export async function deleteFlagGroup(projectId: string, groupId: string): Promise<boolean> {
  return deleteFlagGroupById(projectId, groupId);
}
