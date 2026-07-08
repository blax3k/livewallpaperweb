import { useState } from 'react';
import { Button } from './components/Button';
import type { FlagDefinition, FlagGroup } from './api';

export function generateUniqueId(existingIds: Set<string>): string {
  let id: string;
  do {
    id = crypto.randomUUID().slice(0, 8);
  } while (existingIds.has(id));
  return id;
}

interface FlagEditModalProps {
  flag: FlagDefinition;
  isNew?: boolean;
  groups: FlagGroup[];
  onSave: (flag: FlagDefinition) => void;
  onCancel: () => void;
}

export function FlagEditModal({ flag: initial, isNew, groups, onSave, onCancel }: FlagEditModalProps) {
  const [flag, setFlag] = useState<FlagDefinition>(() => ({ ...initial }))

  const handleGroupSelect = (value: string) => {
    setFlag({ ...flag, group: value || undefined });
  };


  return (
    <div className="modal-overlay">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">{isNew ? 'New Flag' : 'Edit Flag'}</h2>
        <div className="form-row">
          <label>Name</label>
          <input
            value={flag.name}
            onChange={e => setFlag({ ...flag, name: e.target.value })}
            placeholder="Flag display name"
            autoFocus
          />
        </div>
        <div className="form-row">
          <label>Group</label>
            <select value={flag.group ?? ''} onChange={e => handleGroupSelect(e.target.value)}>
              <option value="">(ungrouped)</option>
              {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
        </div>
        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!flag.name.trim()} onClick={() => onSave(flag)}>Save Flag</Button>
        </div>
      </div>
    </div>
  );
}

interface RenameFlagModalProps {
  flag: FlagDefinition;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function RenameFlagModal({ flag, onSave, onCancel }: RenameFlagModalProps) {
  const [name, setName] = useState(flag.name);
  return (
    <div className="modal-overlay">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Rename Flag</h2>
        <div className="form-row">
          <label>Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Flag display name"
            autoFocus
          />
        </div>
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
        <p className="section-hint">Starts empty. Add flags from a group&apos;s ⋯ menu, or move existing ones in.</p>
        <div className="modal-footer">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onCreate(name.trim())}>Create group</Button>
        </div>
      </div>
    </div>
  );
}

interface RenameGroupModalProps {
  group: FlagGroup;
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

interface RemoveFlagGuardedModalProps {
  flag: FlagDefinition;
  usage: { scenes: string[]; rules: string[] };
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveFlagGuardedModal({ flag, usage, onCancel, onConfirm }: RemoveFlagGuardedModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title" style={{ color: 'var(--color-danger)' }}>⚠ Remove &quot;{flag.name || flag.id}&quot;?</h2>
        <p style={{ fontSize: 'var(--text-12)', lineHeight: 1.55, color: 'var(--color-fg-subtle)' }}>
          This flag is still referenced. Removing it will turn those conditions off and may change which scenes qualify.
        </p>
        <p className="section-title">Used by {usage.scenes.length + usage.rules.length}</p>
        {usage.rules.map(name => (
          <div key={`rule-${name}`} className="form-row">
            <label>RULE</label>
            <span>{name}</span>
          </div>
        ))}
        {usage.scenes.map(name => (
          <div key={`scene-${name}`} className="form-row">
            <label>SCENE</label>
            <span>{name}</span>
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
  group: FlagGroup;
  affectedFlags: FlagDefinition[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveGroupModal({ group, affectedFlags, onCancel, onConfirm }: RemoveGroupModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title" style={{ color: 'var(--color-danger)' }}>⚠ Remove group &quot;{group.name}&quot;?</h2>
        <p style={{ fontSize: 'var(--text-12)', lineHeight: 1.55, color: 'var(--color-fg-subtle)' }}>
          The group is deleted, but its flags aren&apos;t. These <strong>{affectedFlags.length} flags</strong> move
          to <strong>Ungrouped</strong> and keep every rule &amp; scene reference:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--size-6)' }}>
          {affectedFlags.map(f => (
            <span
              key={f.id}
              style={{
                height: '22px',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 var(--size-8)',
                borderRadius: '11px',
                background: 'var(--color-input)',
                border: '1px solid var(--color-border-strong)',
                fontFamily: 'ui-monospace, Menlo, monospace',
                fontSize: 'var(--text-11)',
                color: 'var(--color-fg-muted)',
              }}
            >
              {f.name || f.id}
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
