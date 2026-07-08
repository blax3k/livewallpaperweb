import type { RuleAction, RuleCondition, RuleConditionGroup, RuleDefinition } from '@livewallpaper/types';
import { pool } from '../../db';
import { RuleGroupObject, RuleObject } from './ruleObject';

const PROJECT_EXISTS_SQL = `SELECT 1 FROM projects WHERE id = $1 AND status <> 'DELETED'`;

type RuleRow = { id: string; name: string; one_shot: boolean; group_name: string | null };

type ConditionRow = {
  rule_id: string;
  group_position: number;
  type: RuleCondition['type'];
  flag_id: string | null;
  flag_change_type: 'activated' | 'deactivated' | null;
  scene_id: string | null;
  operator: RuleCondition['operator'] | null;
  int_value: number | null;
  start_hour: number | null;
  end_hour: number | null;
  days_of_week: number[] | null;
};

type ActionRow = { rule_id: string; type: RuleAction['type']; flag_id: string | null };

function conditionRowToCondition(row: ConditionRow): RuleCondition {
  const check: RuleCondition = { type: row.type };
  if (row.flag_id !== null) check.flagId = row.flag_id;
  if (row.flag_change_type !== null) check.flagChangeType = row.flag_change_type;
  if (row.scene_id !== null) check.sceneId = row.scene_id;
  if (row.operator !== null) check.operator = row.operator;
  if (row.int_value !== null) check.intValue = row.int_value;
  if (row.start_hour !== null) check.startHour = row.start_hour;
  if (row.end_hour !== null) check.endHour = row.end_hour;
  if (row.days_of_week !== null) check.daysOfWeek = row.days_of_week;
  return check;
}

export async function selectRulesForProject(projectId: string): Promise<RuleObject[]> {
  const [ruleRows, conditionRows, actionRows] = await Promise.all([
    pool.query<RuleRow>(
      `SELECT r.id, r.name, r.one_shot, rg.name AS group_name
       FROM rules r
       LEFT JOIN rule_groups rg ON rg.id = r.group_id
       WHERE r.project_id = $1
       ORDER BY r.name ASC`,
      [projectId],
    ),
    pool.query<ConditionRow>(
      `SELECT rcg.rule_id, rcg.position AS group_position, rc.type, rc.flag_id, rc.flag_change_type,
              rc.scene_id, rc.operator, rc.int_value, rc.start_hour, rc.end_hour, rc.days_of_week
       FROM rule_condition_groups rcg
       JOIN rule_conditions rc ON rc.group_id = rcg.id
       WHERE rcg.project_id = $1
       ORDER BY rcg.position ASC, rc.position ASC`,
      [projectId],
    ),
    pool.query<ActionRow>(
      `SELECT rule_id, type, flag_id
       FROM rule_actions
       WHERE project_id = $1
       ORDER BY rule_id ASC, position ASC`,
      [projectId],
    ),
  ]);

  const conditionsByRule = new Map<string, RuleConditionGroup[]>();
  for (const row of conditionRows.rows) {
    let groups = conditionsByRule.get(row.rule_id);
    if (!groups) conditionsByRule.set(row.rule_id, (groups = []));
    let group = groups[row.group_position];
    if (!group) groups[row.group_position] = (group = { operator: 'AND', checks: [] });
    group.checks.push(conditionRowToCondition(row));
  }

  const actionsByRule = new Map<string, RuleAction[]>();
  for (const row of actionRows.rows) {
    const list = actionsByRule.get(row.rule_id) ?? [];
    list.push(row.flag_id !== null ? { type: row.type, flagId: row.flag_id } : { type: row.type });
    actionsByRule.set(row.rule_id, list);
  }

  return ruleRows.rows.map(row => new RuleObject(
    row.id,
    row.name,
    row.one_shot,
    row.group_name,
    (conditionsByRule.get(row.id) ?? []).filter((group): group is RuleConditionGroup => !!group),
    actionsByRule.get(row.id) ?? [],
  ));
}

export async function replaceRulesForProject(projectId: string, rules: RuleDefinition[]): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query(PROJECT_EXISTS_SQL, [projectId]);
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const groupNames = [...new Set(rules.map(r => r.group?.trim()).filter((g): g is string => !!g))];

    if (groupNames.length > 0) {
      await client.query(
        `INSERT INTO rule_groups (project_id, name)
         SELECT $1, unnest($2::text[])
         ON CONFLICT (project_id, name) DO NOTHING`,
        [projectId, groupNames],
      );
    }

    const groupRows = await client.query<{ id: string; name: string }>(
      'SELECT id, name FROM rule_groups WHERE project_id = $1',
      [projectId],
    );
    const groupIdByName = new Map(groupRows.rows.map(r => [r.name, r.id]));

    // Cascades into rule_condition_groups → rule_conditions, and into rule_actions.
    await client.query('DELETE FROM rules WHERE project_id = $1', [projectId]);

    for (const rule of rules) {
      const groupName = rule.group?.trim();
      const groupId = groupName ? (groupIdByName.get(groupName) ?? null) : null;

      await client.query(
        `INSERT INTO rules (project_id, id, name, group_id, one_shot)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectId, rule.id, rule.name, groupId, rule.oneShot ?? false],
      );

      const conditionGroups = rule.conditions ?? [];
      for (let gi = 0; gi < conditionGroups.length; gi++) {
        const group = conditionGroups[gi];
        if (group.checks.length === 0) continue;

        const groupResult = await client.query<{ id: string }>(
          `INSERT INTO rule_condition_groups (project_id, rule_id, position) VALUES ($1, $2, $3) RETURNING id`,
          [projectId, rule.id, gi],
        );
        const groupId2 = groupResult.rows[0].id;

        for (let ci = 0; ci < group.checks.length; ci++) {
          const check = group.checks[ci];
          await client.query(
            `INSERT INTO rule_conditions
               (group_id, position, type, project_id, flag_id, flag_change_type, scene_id, operator, int_value, start_hour, end_hour, days_of_week)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              groupId2, ci, check.type, projectId,
              check.flagId ?? null, check.flagChangeType ?? null, check.sceneId ?? null,
              check.operator ?? null, check.intValue ?? null, check.startHour ?? null, check.endHour ?? null,
              check.daysOfWeek ?? null,
            ],
          );
        }
      }

      for (let ai = 0; ai < rule.actions.length; ai++) {
        const action = rule.actions[ai];
        await client.query(
          `INSERT INTO rule_actions (project_id, rule_id, position, type, flag_id) VALUES ($1, $2, $3, $4, $5)`,
          [projectId, rule.id, ai, action.type, action.flagId ?? null],
        );
      }
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

export async function selectRuleGroupsForProject(projectId: string): Promise<RuleGroupObject[]> {
  const result = await pool.query<{ id: string; name: string }>(
    'SELECT id, name FROM rule_groups WHERE project_id = $1 ORDER BY name ASC',
    [projectId],
  );
  return result.rows.map(RuleGroupObject.fromRow);
}

export async function projectExists(projectId: string): Promise<boolean> {
  const result = await pool.query(PROJECT_EXISTS_SQL, [projectId]);
  return (result.rowCount ?? 0) > 0;
}

export async function insertRuleGroup(projectId: string, name: string): Promise<RuleGroupObject> {
  const result = await pool.query<{ id: string; name: string }>(
    'INSERT INTO rule_groups (project_id, name) VALUES ($1, $2) RETURNING id, name',
    [projectId, name],
  );
  return RuleGroupObject.fromRow(result.rows[0]);
}

export async function updateRuleGroupName(projectId: string, groupId: string, name: string): Promise<RuleGroupObject | null> {
  const result = await pool.query<{ id: string; name: string }>(
    'UPDATE rule_groups SET name = $3 WHERE project_id = $1 AND id = $2 RETURNING id, name',
    [projectId, groupId, name],
  );
  return result.rows[0] ? RuleGroupObject.fromRow(result.rows[0]) : null;
}

export async function deleteRuleGroupById(projectId: string, groupId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM rule_groups WHERE project_id = $1 AND id = $2',
    [projectId, groupId],
  );
  return (result.rowCount ?? 0) > 0;
}
