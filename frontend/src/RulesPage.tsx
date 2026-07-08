import React, { useState, useEffect, useCallback } from 'react';
import './RulesPage.scss';
import { Button } from './components/Button';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';
import { rulesApi, flagsApi, type RuleDefinition, type FlagDefinition } from './api';
import type { RuleConditionGroup, RuleCondition, RuleAction } from '@livewallpaper/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function generateRuleId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export function emptyRule(): RuleDefinition {
  return {
    id: '',
    name: '',
    conditions: [],
    actions: [],
    oneShot: false,
  };
}

// This editor only ever shows a single flat AND/OR group (the full OR-of-AND-groups
// builder is a separate redesign). Round-trips losslessly for anything this UI can
// produce: a single AND group, or several single-check groups standing in for one OR group.
function conditionsToFlatGroup(conditions: RuleConditionGroup[] | undefined): RuleConditionGroup {
  const groups = (conditions ?? []).filter(g => g.checks.length > 0);
  if (groups.length === 0) return { operator: 'AND', checks: [] };
  if (groups.length === 1) return groups[0];
  return { operator: 'OR', checks: groups.flatMap(g => g.checks) };
}

function flatGroupToConditions(group: RuleConditionGroup): RuleConditionGroup[] {
  if (group.checks.length === 0) return [];
  if (group.operator === 'OR' && group.checks.length > 1) {
    return group.checks.map(c => ({ operator: 'AND' as const, checks: [c] }));
  }
  return [{ operator: 'AND', checks: group.checks }];
}

function emptyCondition(): RuleCondition {
  return { type: 'flag_active', flagId: '' };
}

function emptyAction(): RuleAction {
  return { type: 'activate_flag', flagId: '' };
}

const CONDITION_TYPES: { value: RuleCondition['type']; label: string }[] = [
  { value: 'flag_active', label: 'Flag is active' },
  { value: 'flag_inactive', label: 'Flag is inactive' },
  { value: 'time_of_day', label: 'Time of day' },
  { value: 'day_of_week', label: 'Day of week' },
  { value: 'scene_count', label: 'Scene show count' },
  { value: 'install_duration_hours', label: 'Hours since install' },
  { value: 'time_since_flag_change', label: 'Hours since flag changed' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Condition editor ─────────────────────────────────────────────────────────

interface ConditionEditorProps {
  condition: RuleCondition;
  flags: FlagDefinition[];
  onChange: (c: RuleCondition) => void;
  onDelete: () => void;
}

function ConditionEditor({ condition, flags, onChange, onDelete }: ConditionEditorProps) {
  const set = (patch: Partial<RuleCondition>) => onChange({ ...condition, ...patch });

  const typeChanged = (type: RuleCondition['type']) => {
    const base: RuleCondition = { type };
    if (type === 'flag_active' || type === 'flag_inactive') base.flagId = condition.flagId ?? '';
    if (type === 'time_of_day') { base.startHour = 6; base.endHour = 22; }
    if (type === 'day_of_week') base.daysOfWeek = [];
    if (type === 'scene_count') { base.operator = '>='; base.intValue = 1; }
    if (type === 'install_duration_hours') { base.operator = '>='; base.intValue = 24; }
    if (type === 'time_since_flag_change') {
      base.flagId = condition.flagId ?? '';
      base.flagChangeType = 'activated';
      base.operator = '>=';
      base.intValue = 1;
    }
    onChange(base);
  };

  return (
    <div className="condition-row">
      <select value={condition.type} onChange={e => typeChanged(e.target.value as RuleCondition['type'])}>
        {CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {(condition.type === 'flag_active' || condition.type === 'flag_inactive') && (
        <select value={condition.flagId ?? ''} onChange={e => set({ flagId: e.target.value })}>
          <option value="">— select flag —</option>
          {flags.map(f => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
        </select>
      )}

      {condition.type === 'time_of_day' && (
        <>
          <label>Start</label>
          <input type="number" min={0} max={23} value={condition.startHour ?? 0} onChange={e => set({ startHour: +e.target.value })} />
          <label>End</label>
          <input type="number" min={0} max={23} value={condition.endHour ?? 0} onChange={e => set({ endHour: +e.target.value })} />
          <span className="condition-hint">(exclusive; 22–6 = overnight wrap)</span>
        </>
      )}

      {condition.type === 'day_of_week' && (
        <div className="condition-days">
          {DAY_LABELS.map((label, i) => {
            const checked = (condition.daysOfWeek ?? []).includes(i);
            return (
              <label key={i} className="condition-day-label">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const days = condition.daysOfWeek ?? [];
                    set({ daysOfWeek: checked ? days.filter(d => d !== i) : [...days, i] });
                  }}
                />
                {label}
              </label>
            );
          })}
        </div>
      )}

      {(condition.type === 'scene_count' || condition.type === 'install_duration_hours') && (
        <>
          <select value={condition.operator ?? '>='} onChange={e => set({ operator: e.target.value as RuleCondition['operator'] })}>
            {['>=', '<=', '==', '>', '<'].map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <input type="number" min={0} value={condition.intValue ?? 0} onChange={e => set({ intValue: +e.target.value })} />
        </>
      )}

      {condition.type === 'time_since_flag_change' && (
        <>
          <select value={condition.flagId ?? ''} onChange={e => set({ flagId: e.target.value })}>
            <option value="">— select flag —</option>
            {flags.map(f => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
          </select>
          <select value={condition.flagChangeType ?? 'activated'} onChange={e => set({ flagChangeType: e.target.value as 'activated' | 'deactivated' })}>
            <option value="activated">was activated</option>
            <option value="deactivated">was deactivated</option>
          </select>
          <select value={condition.operator ?? '>='} onChange={e => set({ operator: e.target.value as RuleCondition['operator'] })}>
            {['>=', '<=', '==', '>', '<'].map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <input type="number" min={0} value={condition.intValue ?? 0} onChange={e => set({ intValue: +e.target.value })} />
          <span className="condition-hint">hours</span>
        </>
      )}

      <button className="condition-delete" onClick={onDelete} title="Remove condition">✕</button>
    </div>
  );
}

// ─── Action editor ────────────────────────────────────────────────────────────

interface ActionEditorProps {
  action: RuleAction;
  flags: FlagDefinition[];
  onChange: (a: RuleAction) => void;
  onDelete: () => void;
}

function ActionEditor({ action, flags, onChange, onDelete }: ActionEditorProps) {
  return (
    <div className="action-row">
      <select value={action.type} onChange={e => onChange({ ...action, type: e.target.value as RuleAction['type'] })}>
        <option value="activate_flag">Activate flag</option>
        <option value="deactivate_flag">Deactivate flag</option>
      </select>
      <select value={action.flagId ?? ''} onChange={e => onChange({ ...action, flagId: e.target.value })}>
        <option value="">— select flag —</option>
        {flags.map(f => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
      </select>
      <button className="condition-delete" onClick={onDelete} title="Remove action">✕</button>
    </div>
  );
}

// ─── Rule edit modal ──────────────────────────────────────────────────────────

interface RuleEditModalProps {
  rule: RuleDefinition;
  flags: FlagDefinition[];
  onSave: (rule: RuleDefinition) => void;
  onCancel: () => void;
}

export function RuleEditModal({ rule: initial, flags, onSave, onCancel }: RuleEditModalProps) {
  const [rule, setRule] = useState<RuleDefinition>(() => JSON.parse(JSON.stringify(initial)));

  const setField = <K extends keyof RuleDefinition>(key: K, value: RuleDefinition[K]) =>
    setRule(r => ({ ...r, [key]: value }));

  const conditions: RuleConditionGroup = conditionsToFlatGroup(rule.conditions);

  const setConditions = (g: RuleConditionGroup) => setField('conditions', flatGroupToConditions(g));

  const addCondition = () =>
    setConditions({ ...conditions, checks: [...conditions.checks, emptyCondition()] });

  const updateCondition = (i: number, c: RuleCondition) =>
    setConditions({ ...conditions, checks: conditions.checks.map((ch, idx) => idx === i ? c : ch) });

  const deleteCondition = (i: number) =>
    setConditions({ ...conditions, checks: conditions.checks.filter((_, idx) => idx !== i) });

  const addAction = () => setField('actions', [...rule.actions, emptyAction()]);

  const updateAction = (i: number, a: RuleAction) =>
    setField('actions', rule.actions.map((act, idx) => idx === i ? a : act));

  const deleteAction = (i: number) =>
    setField('actions', rule.actions.filter((_, idx) => idx !== i));

  const handleNameBlur = () => {
    if (!rule.id && rule.name) setField('id', generateRuleId(rule.name));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box rule-modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{initial.id ? 'Edit Rule' : 'New Rule'}</h2>

        <div className="form-row">
          <label>Name</label>
          <input
            value={rule.name}
            onChange={e => setField('name', e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Rule display name"
          />
        </div>
        <div className="form-row">
          <label>ID</label>
          <input
            value={rule.id}
            onChange={e => setField('id', e.target.value)}
            placeholder="rule_id"
            spellCheck={false}
          />
        </div>
        <div className="form-row">
          <label>
            <input type="checkbox" checked={rule.oneShot ?? false} onChange={e => setField('oneShot', e.target.checked)} />
            {' '}One-shot (fires only once ever)
          </label>
        </div>

        <h3 className="section-title">
          Conditions
          <select
            value={conditions.operator}
            onChange={e => setConditions({ ...conditions, operator: e.target.value as 'AND' | 'OR' })}
            style={{ marginLeft: 'var(--size-8)', fontSize: 'var(--text-13)' }}
          >
            <option value="AND">ALL must pass (AND)</option>
            <option value="OR">ANY must pass (OR)</option>
          </select>
        </h3>
        <p className="section-hint">Leave empty to always fire.</p>
        {conditions.checks.map((c, i) => (
          <ConditionEditor
            key={i}
            condition={c}
            flags={flags}
            onChange={updated => updateCondition(i, updated)}
            onDelete={() => deleteCondition(i)}
          />
        ))}
        <Button onClick={addCondition} style={{ marginBottom: 'var(--size-16)' }}>+ Condition</Button>

        <h3 className="section-title">Actions</h3>
        {rule.actions.map((a, i) => (
          <ActionEditor
            key={i}
            action={a}
            flags={flags}
            onChange={updated => updateAction(i, updated)}
            onDelete={() => deleteAction(i)}
          />
        ))}
        <Button onClick={addAction} style={{ marginBottom: 'var(--size-16)' }}>+ Action</Button>

        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(rule)}>Save Rule</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Rules page ───────────────────────────────────────────────────────────────

interface RulesPageProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

export function RulesPage({ projectId, projectName, onBack }: RulesPageProps) {
  const [rules, setRules] = useState<RuleDefinition[]>([]);
  const [flags, setFlags] = useState<FlagDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isNewRule, setIsNewRule] = useState(false);

  useEffect(() => {
    Promise.all([rulesApi.list(projectId), flagsApi.list(projectId)])
      .then(([r, f]) => { setRules(r); setFlags(f); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, [projectId]);

  const save = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await rulesApi.save(projectId, rules);
      setDirty(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }, [projectId, rules]);

  const openEdit = (index: number) => {
    setIsNewRule(false);
    setEditingIndex(index);
  };

  const openNew = () => {
    setRules(prev => [...prev, emptyRule()]);
    setIsNewRule(true);
    setEditingIndex(rules.length);
  };

  const handleSaveRule = (updated: RuleDefinition) => {
    setRules(prev => prev.map((r, i) => i === editingIndex ? updated : r));
    setEditingIndex(null);
    setDirty(true);
  };

  const handleCancelEdit = () => {
    if (isNewRule && editingIndex !== null) {
      setRules(prev => prev.filter((_, i) => i !== editingIndex));
    }
    setEditingIndex(null);
  };

  const deleteRule = (index: number) => {
    if (!window.confirm('Delete this rule?')) return;
    setRules(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const handleBack = useCallback(() => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    onBack();
  }, [dirty, onBack]);

  return (
    <PageLayout>
      <PageHeader title={`${projectName} — Rules`} left={<Button onClick={handleBack}>←</Button>}>
        {dirty && (
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
        <Button onClick={openNew}>+ Rule</Button>
      </PageHeader>
      <PageBody>
        {loading && <p style={{ padding: 'var(--size-16)' }}>Loading…</p>}
        {error && <p style={{ padding: 'var(--size-16)', color: 'var(--color-danger)' }}>{error}</p>}
        {!loading && (
          <>
            <p style={{ padding: 'var(--size-8) var(--size-16)', color: 'var(--color-fg-subtle)', fontSize: 'var(--text-13)' }}>
              Rules are evaluated every 5 minutes when the wallpaper is visible. When a rule&apos;s conditions
              pass, its actions fire and flags are updated. One-shot rules fire at most once.
            </p>
            {rules.length === 0 ? (
              <p style={{ padding: 'var(--size-16)', color: 'var(--color-fg-faint)' }}>No rules defined. Click &ldquo;+ Rule&rdquo; to create one.</p>
            ) : (
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Conditions</th>
                    <th>Actions</th>
                    <th>One-shot</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule, i) => (
                    <tr key={i} className="rules-table__row">
                      <td>{rule.name || <span style={{ color: 'var(--color-fg-faint)' }}>(unnamed)</span>}</td>
                      <td><code>{rule.id || '—'}</code></td>
                      <td>{(rule.conditions ?? []).reduce((n, g) => n + g.checks.length, 0)} check(s)</td>
                      <td>{rule.actions?.length ?? 0} action(s)</td>
                      <td>{rule.oneShot ? 'Yes' : 'No'}</td>
                      <td className="rules-table__actions">
                        <Button onClick={() => openEdit(i)}>Edit</Button>
                        <Button variant="danger" onClick={() => deleteRule(i)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </PageBody>

      {editingIndex !== null && (
        <RuleEditModal
          rule={rules[editingIndex]}
          flags={flags}
          onSave={handleSaveRule}
          onCancel={handleCancelEdit}
        />
      )}
    </PageLayout>
  );
}
