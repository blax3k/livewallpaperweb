import type { FlagDefinition } from '@livewallpaper/types';
import { pool } from '../../db';
import { FlagGroupObject, FlagObject } from './flagObject';

const PROJECT_EXISTS_SQL = `SELECT 1 FROM projects WHERE id = $1 AND status <> 'DELETED'`;

export async function selectFlagsForProject(projectId: string): Promise<FlagObject[]> {
  const result = await pool.query<{ id: string; name: string; default_active: boolean; group_name: string | null }>(
    `SELECT f.id, f.name, f.default_active, fg.name AS group_name
     FROM flags f
     LEFT JOIN flag_groups fg ON fg.id = f.group_id
     WHERE f.project_id = $1
     ORDER BY f.name ASC`,
    [projectId],
  );
  return result.rows.map(FlagObject.fromRow);
}

export async function replaceFlagsForProject(projectId: string, flags: FlagDefinition[]): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query(PROJECT_EXISTS_SQL, [projectId]);
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const groupNames = [...new Set(flags.map(f => f.group?.trim()).filter((g): g is string => !!g))];

    if (groupNames.length > 0) {
      await client.query(
        `INSERT INTO flag_groups (project_id, name)
         SELECT $1, unnest($2::text[])
         ON CONFLICT (project_id, name) DO NOTHING`,
        [projectId, groupNames],
      );
    }

    const groupRows = await client.query<{ id: string; name: string }>(
      'SELECT id, name FROM flag_groups WHERE project_id = $1',
      [projectId],
    );
    const groupIdByName = new Map(groupRows.rows.map(r => [r.name, r.id]));

    await client.query('DELETE FROM flags WHERE project_id = $1', [projectId]);

    for (const flag of flags) {
      const groupName = flag.group?.trim();
      const groupId = groupName ? (groupIdByName.get(groupName) ?? null) : null;
      await client.query(
        `INSERT INTO flags (project_id, id, name, group_id, default_active)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectId, flag.id, flag.name, groupId, flag.defaultActive ?? false],
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function selectFlagGroupsForProject(projectId: string): Promise<FlagGroupObject[]> {
  const result = await pool.query<{ id: string; name: string }>(
    'SELECT id, name FROM flag_groups WHERE project_id = $1 ORDER BY name ASC',
    [projectId],
  );
  return result.rows.map(FlagGroupObject.fromRow);
}

export async function projectExists(projectId: string): Promise<boolean> {
  const result = await pool.query(PROJECT_EXISTS_SQL, [projectId]);
  return (result.rowCount ?? 0) > 0;
}

export async function insertFlagGroup(projectId: string, name: string): Promise<FlagGroupObject> {
  const result = await pool.query<{ id: string; name: string }>(
    'INSERT INTO flag_groups (project_id, name) VALUES ($1, $2) RETURNING id, name',
    [projectId, name],
  );
  return FlagGroupObject.fromRow(result.rows[0]);
}

export async function updateFlagGroupName(projectId: string, groupId: string, name: string): Promise<FlagGroupObject | null> {
  const result = await pool.query<{ id: string; name: string }>(
    'UPDATE flag_groups SET name = $3 WHERE project_id = $1 AND id = $2 RETURNING id, name',
    [projectId, groupId, name],
  );
  return result.rows[0] ? FlagGroupObject.fromRow(result.rows[0]) : null;
}

export async function deleteFlagGroupById(projectId: string, groupId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM flag_groups WHERE project_id = $1 AND id = $2',
    [projectId, groupId],
  );
  return (result.rowCount ?? 0) > 0;
}

async function selectSceneNamesUsingFlag(projectId: string, flagId: string): Promise<string[]> {
  const result = await pool.query<{ name: string }>(
    `SELECT DISTINCT s.name
     FROM scenes s
     WHERE s.project_id = $1
       AND s.status <> 'DELETED'
       AND (
         jsonb_path_exists(s.flag_declarations, '$.required[*] ? (@ == $f)', jsonb_build_object('f', $2::text))
         OR jsonb_path_exists(s.flag_declarations, '$.excluded[*] ? (@ == $f)', jsonb_build_object('f', $2::text))
         OR jsonb_path_exists(s.flag_declarations, '$.scored[*].flagId ? (@ == $f)', jsonb_build_object('f', $2::text))
         OR EXISTS (
           SELECT 1 FROM sprites sp WHERE sp.scene_id = s.id
             AND jsonb_path_exists(sp.conditions, '$[*].conditions.checks[*].flagId ? (@ == $f)', jsonb_build_object('f', $2::text))
         )
       )
     ORDER BY s.name`,
    [projectId, flagId],
  );
  return result.rows.map(r => r.name);
}

async function selectRuleNamesUsingFlag(projectId: string, flagId: string): Promise<string[]> {
  const result = await pool.query<{ name: string }>(
    `SELECT DISTINCT r.name
     FROM rules r
     WHERE r.project_id = $1
       AND (
         EXISTS (
           SELECT 1 FROM rule_condition_groups rcg
           JOIN rule_conditions rc ON rc.group_id = rcg.id
           WHERE rcg.project_id = r.project_id AND rcg.rule_id = r.id AND rc.flag_id = $2
         )
         OR EXISTS (
           SELECT 1 FROM rule_actions ra
           WHERE ra.project_id = r.project_id AND ra.rule_id = r.id AND ra.flag_id = $2
         )
       )
     ORDER BY r.name`,
    [projectId, flagId],
  );
  return result.rows.map(r => r.name);
}

export async function selectFlagUsage(projectId: string, flagId: string): Promise<{ scenes: string[]; rules: string[] }> {
  const [scenes, rules] = await Promise.all([
    selectSceneNamesUsingFlag(projectId, flagId),
    selectRuleNamesUsingFlag(projectId, flagId),
  ]);
  return { scenes, rules };
}

export async function selectFlagUsageCounts(projectId: string): Promise<Record<string, { rules: number; scenes: number }>> {
  const [flagRows, ruleUsageRows] = await Promise.all([
    pool.query<{ id: string }>('SELECT id FROM flags WHERE project_id = $1', [projectId]),
    pool.query<{ flag_id: string; cnt: string }>(
      `SELECT flag_id, COUNT(DISTINCT rule_id) AS cnt FROM (
         SELECT rc.flag_id, rcg.rule_id
         FROM rule_condition_groups rcg
         JOIN rule_conditions rc ON rc.group_id = rcg.id
         WHERE rcg.project_id = $1 AND rc.flag_id IS NOT NULL
         UNION ALL
         SELECT ra.flag_id, ra.rule_id
         FROM rule_actions ra
         WHERE ra.project_id = $1 AND ra.flag_id IS NOT NULL
       ) usages
       GROUP BY flag_id`,
      [projectId],
    ),
  ]);

  const ruleCountByFlag = new Map(ruleUsageRows.rows.map(r => [r.flag_id, Number(r.cnt)]));

  const counts: Record<string, { rules: number; scenes: number }> = {};
  await Promise.all(flagRows.rows.map(async ({ id: flagId }) => {
    const scenes = await selectSceneNamesUsingFlag(projectId, flagId);
    counts[flagId] = { rules: ruleCountByFlag.get(flagId) ?? 0, scenes: scenes.length };
  }));

  return counts;
}
