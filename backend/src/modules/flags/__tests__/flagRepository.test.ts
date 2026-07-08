import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import { pool } from '../../../db';
import { replaceFlagsForProject } from '../flagRepository';
import { replaceRulesForProject } from '../../rules/ruleRepository';

describe('replaceFlagsForProject', () => {
  let projectId: string;

  before(async () => {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO projects (id, name, status) VALUES (gen_random_uuid(), 'flagRepository test project', 'ACTIVE') RETURNING id`,
    );
    projectId = result.rows[0].id;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM flags WHERE project_id = $1', [projectId]);
    await pool.query('DELETE FROM rules WHERE project_id = $1', [projectId]);
  });

  after(async () => {
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await pool.end();
  });

  it('re-saving a flag under a new group does not break existing rules that reference it', async () => {
    await replaceFlagsForProject(projectId, [{ id: 'my_flag', name: 'My Flag' }]);
    await replaceRulesForProject(projectId, [
      {
        id: 'my_rule',
        name: 'My Rule',
        actions: [{ type: 'activate_flag', flagId: 'my_flag' }],
        conditions: [{ operator: 'AND', checks: [{ type: 'flag_active', flagId: 'my_flag' }] }],
      },
    ]);

    // This is what the Simulator page does when you move a flag to a different group:
    // it re-saves the full flag list. It must not throw the
    // 'null value in column "project_id" of relation "rule_conditions"' error, and it must
    // not silently null out the my_rule condition/action's reference to my_flag.
    const result = await replaceFlagsForProject(projectId, [{ id: 'my_flag', name: 'My Flag', group: 'New Group' }]);
    assert.equal(result, true);

    const conditions = await pool.query<{ flag_id: string | null }>(
      `SELECT rc.flag_id
       FROM rule_conditions rc
       JOIN rule_condition_groups rcg ON rcg.id = rc.group_id
       WHERE rcg.project_id = $1`,
      [projectId],
    );
    assert.deepEqual(conditions.rows, [{ flag_id: 'my_flag' }]);

    const actions = await pool.query<{ flag_id: string | null }>(
      'SELECT flag_id FROM rule_actions WHERE project_id = $1',
      [projectId],
    );
    assert.deepEqual(actions.rows, [{ flag_id: 'my_flag' }]);
  });

  it('omitting a flag from the saved list still deletes it', async () => {
    await replaceFlagsForProject(projectId, [
      { id: 'keep_me', name: 'Keep Me' },
      { id: 'drop_me', name: 'Drop Me' },
    ]);

    await replaceFlagsForProject(projectId, [{ id: 'keep_me', name: 'Keep Me' }]);

    const flags = await pool.query<{ id: string }>('SELECT id FROM flags WHERE project_id = $1', [projectId]);
    assert.deepEqual(flags.rows.map(r => r.id), ['keep_me']);
  });
});
