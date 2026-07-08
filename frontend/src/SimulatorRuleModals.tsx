import { useState } from 'react';
import { Button } from './components/Button';
import type { RuleDefinition, RuleGroup, FlagDefinition } from './api';
import type { RuleConditionGroup, RuleCondition, RuleAction } from '@livewallpaper/types';

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

interface RenameRuleModalProps {
  rule: RuleDefinition;
  comboCount: number;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function RenameRuleModal({ rule, comboCount, onSave, onCancel }: RenameRuleModalProps) {
  const [name, setName] = useState(rule.name);
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Rename Rule</h2>
        <div className="form-row">
          <label>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Rule display name"
            autoFocus
          />
        </div>
        {comboCount > 0 && (
          <p className="section-hint">
            Renaming updates its label everywhere it&apos;s referenced — <strong>{comboCount} combo rule{comboCount === 1 ? '' : 's'}</strong>.
          </p>
        )}
        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onSave(name.trim())}>Save</Button>
        </div>
      </div>
    </div>
  );
}

interface NewGroupModalProps {
  onCreate: (name: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export function NewGroupModal({ onCreate, onCancel, error }: NewGroupModalProps) {
  const [name, setName] = useState('');
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">New Group</h2>
        <div className="form-row">
          <label>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(name.trim()); }}
            placeholder="Group name"
            autoFocus
          />
        </div>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-12)' }}>{error}</p>}
        <p className="section-hint">Starts empty. Add rules from a group&apos;s ⋯ menu, or move existing ones in.</p>
        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onCreate(name.trim())}>Create group</Button>
        </div>
      </div>
    </div>
  );
}

interface RenameGroupModalProps {
  group: RuleGroup;
  onSave: (name: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export function RenameGroupModal({ group, onSave, onCancel, error }: RenameGroupModalProps) {
  const [name, setName] = useState(group.name);
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Rename Group</h2>
        <div className="form-row">
          <label>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
            placeholder="Group name"
            autoFocus
          />
        </div>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: 'var(--text-12)' }}>{error}</p>}
        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onSave(name.trim())}>Save</Button>
        </div>
      </div>
    </div>
  );
}

export interface RuleUsageRef {
  type: 'FLAG' | 'COMBO';
  name: string;
}

interface RemoveRuleGuardedModalProps {
  rule: RuleDefinition;
  usage: RuleUsageRef[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveRuleGuardedModal({ rule, usage, onCancel, onConfirm }: RemoveRuleGuardedModalProps) {
  const flagNames = usage.filter(u => u.type === 'FLAG').map(u => u.name);
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title" style={{ color: 'var(--color-danger)' }}>⚠ Remove &quot;{rule.name || rule.id}&quot;?</h2>
        <p style={{ fontSize: 'var(--text-12)', lineHeight: 1.55, color: 'var(--color-fg-subtle)' }}>
          This rule sets {flagNames.join(', ')}. Removing it means {flagNames.length === 1 ? 'that flag' : 'those flags'} can
          never trip, which may change which scenes qualify.
        </p>
        <p className="section-title">Affects {usage.length}</p>
        {usage.map(ref => (
          <div key={`${ref.type}-${ref.name}`} className="form-row">
            <label>{ref.type}</label>
            <span>{ref.name}</span>
          </div>
        ))}
        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Remove anyway</Button>
        </div>
      </div>
    </div>
  );
}

interface RemoveGroupModalProps {
  group: RuleGroup;
  affectedRules: RuleDefinition[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveGroupModal({ group, affectedRules, onCancel, onConfirm }: RemoveGroupModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title" style={{ color: 'var(--color-danger)' }}>⚠ Remove group &quot;{group.name}&quot;?</h2>
        <p style={{ fontSize: 'var(--text-12)', lineHeight: 1.55, color: 'var(--color-fg-subtle)' }}>
          The group is deleted, but its rules aren&apos;t. These <strong>{affectedRules.length} rules</strong> move
          to <strong>Ungrouped</strong> and keep setting their flags:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--size-6)' }}>
          {affectedRules.map(r => (
            <span
              key={r.id}
              style={{
                height: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 var(--size-8)',
                borderRadius: '11px',
                background: 'var(--color-input)',
                border: '1px solid var(--color-border-strong)',
                fontSize: 'var(--text-11)',
                color: 'var(--color-fg-muted)',
              }}
            >
              {r.name || r.id}
            </span>
          ))}
        </div>
        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Remove group</Button>
        </div>
      </div>
    </div>
  );
}
