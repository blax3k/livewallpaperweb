import { useState } from 'react';
import { Button } from './components/Button';
import type { RuleDefinition, RuleGroup } from './api';

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
