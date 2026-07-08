import { Fragment, useState } from 'react';
import { Button } from './components/Button';
import type { RuleDefinition, RuleGroup, FlagDefinition } from './api';
import type { RuleConditionGroup, RuleCondition, RuleAction } from '@livewallpaper/types';

export function emptyRule(): RuleDefinition {
  return {
    id: '',
    name: '',
    conditions: [],
    actions: [],
    oneShot: false,
  };
}

// Existing rules may carry a group with operator 'OR' from before the editor supported
// multiple AND-groups OR'd together (each group card is AND-only; OR happens between
// cards). Explode any such group into one single-check AND-group per check so it
// round-trips losslessly into the new builder.
function normalizeConditionGroups(groups: RuleConditionGroup[] | undefined): RuleConditionGroup[] {
  const result: RuleConditionGroup[] = [];
  for (const g of groups ?? []) {
    if (g.checks.length === 0) continue;
    if (g.operator === 'OR' && g.checks.length > 1) {
      g.checks.forEach(c => result.push({ operator: 'AND', checks: [c] }));
    } else {
      result.push({ operator: 'AND', checks: g.checks });
    }
  }
  return result;
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

// Roughly matches each condition type's natural label width so the row doesn't
// jump around as the type changes.
const CONDITION_TYPE_MIN_WIDTH: Record<RuleCondition['type'], number> = {
  flag_active: 108,
  flag_inactive: 118,
  time_of_day: 118,
  day_of_week: 112,
  scene_count: 140,
  install_duration_hours: 160,
  time_since_flag_change: 160,
};

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
    <div className="rule-edit-modal__row-group">
      <div className="rule-edit-modal__condition-row">
        <select
          className="rule-edit-modal__type-select"
          style={{ minWidth: CONDITION_TYPE_MIN_WIDTH[condition.type] }}
          value={condition.type}
          onChange={e => typeChanged(e.target.value as RuleCondition['type'])}
        >
          {CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {(condition.type === 'flag_active' || condition.type === 'flag_inactive') && (
          <select className="rule-edit-modal__value-select" value={condition.flagId ?? ''} onChange={e => set({ flagId: e.target.value })}>
            <option value="">— select flag —</option>
            {flags.map(f => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
          </select>
        )}

        {condition.type === 'time_of_day' && (
          <>
            <span className="rule-edit-modal__mini-label">Start</span>
            <input className="rule-edit-modal__mini-input" type="number" min={0} max={23} value={condition.startHour ?? 0} onChange={e => set({ startHour: +e.target.value })} />
            <span className="rule-edit-modal__mini-label">End</span>
            <input className="rule-edit-modal__mini-input" type="number" min={0} max={23} value={condition.endHour ?? 0} onChange={e => set({ endHour: +e.target.value })} />
          </>
        )}

        {condition.type === 'day_of_week' && (
          <div className="rule-edit-modal__days">
            {DAY_LABELS.map((label, i) => {
              const checked = (condition.daysOfWeek ?? []).includes(i);
              return (
                <label key={i} className="rule-edit-modal__day-label">
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
            <select className="rule-edit-modal__op-select" value={condition.operator ?? '>='} onChange={e => set({ operator: e.target.value as RuleCondition['operator'] })}>
              {['>=', '<=', '==', '>', '<'].map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <input className="rule-edit-modal__num-input" type="number" min={0} value={condition.intValue ?? 0} onChange={e => set({ intValue: +e.target.value })} />
          </>
        )}

        {condition.type === 'time_since_flag_change' && (
          <>
            <select className="rule-edit-modal__value-select" value={condition.flagId ?? ''} onChange={e => set({ flagId: e.target.value })}>
              <option value="">— select flag —</option>
              {flags.map(f => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
            </select>
            <select className="rule-edit-modal__op-select" value={condition.flagChangeType ?? 'activated'} onChange={e => set({ flagChangeType: e.target.value as 'activated' | 'deactivated' })}>
              <option value="activated">was activated</option>
              <option value="deactivated">was deactivated</option>
            </select>
            <select className="rule-edit-modal__op-select" value={condition.operator ?? '>='} onChange={e => set({ operator: e.target.value as RuleCondition['operator'] })}>
              {['>=', '<=', '==', '>', '<'].map(op => <option key={op} value={op}>{op}</option>)}
            </select>
            <input className="rule-edit-modal__num-input" type="number" min={0} value={condition.intValue ?? 0} onChange={e => set({ intValue: +e.target.value })} />
            <span className="rule-edit-modal__mini-label">hours</span>
          </>
        )}

        <button type="button" className="rule-edit-modal__remove" onClick={onDelete} title="Remove condition">✕</button>
      </div>
      {condition.type === 'time_of_day' && (
        <span className="rule-edit-modal__hint">exclusive; 22–6 wraps overnight</span>
      )}
    </div>
  );
}

interface ActionEditorProps {
  index: number;
  action: RuleAction;
  flags: FlagDefinition[];
  onChange: (a: RuleAction) => void;
  onDelete: () => void;
}

function ActionEditor({ index, action, flags, onChange, onDelete }: ActionEditorProps) {
  return (
    <div className="rule-edit-modal__action-row">
      <span className="rule-edit-modal__action-index">{index + 1}</span>
      <select className="rule-edit-modal__action-type-select" value={action.type} onChange={e => onChange({ ...action, type: e.target.value as RuleAction['type'] })}>
        <option value="activate_flag">Activate flag</option>
        <option value="deactivate_flag">Deactivate flag</option>
      </select>
      <select className="rule-edit-modal__action-value-select" value={action.flagId ?? ''} onChange={e => onChange({ ...action, flagId: e.target.value })}>
        <option value="">— select flag —</option>
        {flags.map(f => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
      </select>
      <button type="button" className="rule-edit-modal__remove" onClick={onDelete} title="Remove action">✕</button>
    </div>
  );
}

interface RuleEditModalProps {
  rule: RuleDefinition;
  flags: FlagDefinition[];
  groups: RuleGroup[];
  onSave: (rule: RuleDefinition) => void;
  onCancel: () => void;
}

export function RuleEditModal({ rule: initial, flags, groups, onSave, onCancel }: RuleEditModalProps) {
  const [rule, setRule] = useState<RuleDefinition>(() => ({
    ...JSON.parse(JSON.stringify(initial)),
    conditions: normalizeConditionGroups(initial.conditions),
  }));

  const setField = <K extends keyof RuleDefinition>(key: K, value: RuleDefinition[K]) =>
    setRule(r => ({ ...r, [key]: value }));

  const conditions = rule.conditions ?? [];
  const setConditions = (next: RuleConditionGroup[]) => setField('conditions', next);

  const addGroup = () =>
    setConditions([...conditions, { operator: 'AND', checks: [emptyCondition()] }]);

  const addConditionToGroup = (groupIndex: number) =>
    setConditions(conditions.map((g, i) => i === groupIndex ? { ...g, checks: [...g.checks, emptyCondition()] } : g));

  const updateConditionInGroup = (groupIndex: number, checkIndex: number, c: RuleCondition) =>
    setConditions(conditions.map((g, i) =>
      i === groupIndex ? { ...g, checks: g.checks.map((ch, j) => j === checkIndex ? c : ch) } : g
    ));

  // Removing a group's last row removes the group itself (its AND-join disappears
  // along with it); removing the last group falls back to "always fire".
  const removeConditionInGroup = (groupIndex: number, checkIndex: number) =>
    setConditions(
      conditions
        .map((g, i) => i === groupIndex ? { ...g, checks: g.checks.filter((_, j) => j !== checkIndex) } : g)
        .filter(g => g.checks.length > 0)
    );

  const addAction = () => setField('actions', [...rule.actions, emptyAction()]);

  const updateAction = (i: number, a: RuleAction) =>
    setField('actions', rule.actions.map((act, idx) => idx === i ? a : act));

  const deleteAction = (i: number) =>
    setField('actions', rule.actions.filter((_, idx) => idx !== i));

  return (
    <div className="modal-overlay">
      <div className="rule-edit-modal" onClick={e => e.stopPropagation()}>
        <div className="rule-edit-modal__header">
          <span className="rule-edit-modal__title">{initial.id ? 'Edit rule' : 'New rule'}</span>
          <button type="button" className="rule-edit-modal__close" onClick={onCancel} aria-label="Close">✕</button>
        </div>

        <div className="rule-edit-modal__body">
          <div className="rule-edit-modal__row">
            <label className="rule-edit-modal__field">
              <span className="rule-edit-modal__label">Name</span>
              <input
                className="rule-edit-modal__input"
                value={rule.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="Rule name"
                autoFocus
              />
            </label>
            <label className="rule-edit-modal__field">
              <span className="rule-edit-modal__label">Group</span>
              <select
                className="rule-edit-modal__input rule-edit-modal__input--select"
                value={rule.group ?? ''}
                onChange={e => setField('group', e.target.value || undefined)}
              >
                <option value="">Ungrouped</option>
                {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </label>
          </div>

          <label className="rule-edit-modal__oneshot">
            <input type="checkbox" checked={rule.oneShot ?? false} onChange={e => setField('oneShot', e.target.checked)} />
            <span>One-shot — fires only once, ever</span>
          </label>

          <div className="rule-edit-modal__section">
            <div className="rule-edit-modal__section-head">
              <span className="rule-edit-modal__section-title">Conditions</span>
              <span className="rule-edit-modal__section-hint">
                Rows in a group must <b>all</b> pass (AND). Groups are <b>OR</b>&apos;d — the rule fires if any one group fully matches. Leave empty to always fire.
              </span>
            </div>

            {conditions.map((group, groupIndex) => (
              <Fragment key={groupIndex}>
                {groupIndex > 0 && (
                  <div className="rule-edit-modal__or-divider"><span /><em>OR</em><span /></div>
                )}
                <div className="rule-edit-modal__group">
                  {group.checks.map((c, checkIndex) => (
                    <Fragment key={checkIndex}>
                      {checkIndex > 0 && (
                        <div className="rule-edit-modal__and-divider"><span /><em>AND</em><span /></div>
                      )}
                      <ConditionEditor
                        condition={c}
                        flags={flags}
                        onChange={updated => updateConditionInGroup(groupIndex, checkIndex, updated)}
                        onDelete={() => removeConditionInGroup(groupIndex, checkIndex)}
                      />
                    </Fragment>
                  ))}
                  <button type="button" className="rule-edit-modal__dashed-btn" onClick={() => addConditionToGroup(groupIndex)}>
                    + Condition
                  </button>
                </div>
              </Fragment>
            ))}

            <button type="button" className="rule-edit-modal__dashed-btn rule-edit-modal__dashed-btn--accent" onClick={addGroup}>
              + Or group
            </button>
          </div>

          <div className="rule-edit-modal__section">
            <div className="rule-edit-modal__section-head">
              <span className="rule-edit-modal__section-title">Actions</span>
              <span className="rule-edit-modal__section-hint">Run in order, top to bottom, whenever the conditions above resolve true.</span>
            </div>
            {rule.actions.map((a, i) => (
              <ActionEditor
                key={i}
                index={i}
                action={a}
                flags={flags}
                onChange={updated => updateAction(i, updated)}
                onDelete={() => deleteAction(i)}
              />
            ))}
            <button type="button" className="rule-edit-modal__dashed-btn" onClick={addAction}>+ Action</button>
          </div>
        </div>

        <div className="rule-edit-modal__footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!rule.name.trim()} onClick={() => onSave(rule)}>Save rule</Button>
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
    <div className="modal-overlay">
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
    <div className="modal-overlay">
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
    <div className="modal-overlay">
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
    <div className="modal-overlay">
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
    <div className="modal-overlay">
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
