import { useState, useEffect, useCallback, useMemo } from 'react';
import './FlagsPage.scss';
import { Button } from './components/Button';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';
import { flagsApi, type FlagDefinition, type FlagGroup } from './api';
import { FlagInUseModal } from './components/FlagInUseModal';

interface FlagsPageProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

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
    <div className="modal-overlay" onClick={onCancel}>
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

interface FlagRowProps {
  flag: FlagDefinition;
  isEditing: boolean;
  isDuplicate: boolean;
  onEdit: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onChange: (updated: FlagDefinition) => void;
  onDefaultActiveChange: (defaultActive: boolean) => void;
  onGroupChange: (group: string) => void;
  onGroupCommit: () => void;
  onDelete: () => void;
}

function FlagRow({ flag, isEditing, isDuplicate, onEdit, onAccept, onCancel, onChange, onDefaultActiveChange, onGroupChange, onGroupCommit, onDelete }: FlagRowProps) {
  return (
    <tr className={`flags-table__row${isDuplicate ? ' flags-table__row--error' : ''}`}>
      <td>
        <div
          className="flags-table__name-cell"
          onBlur={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) onCancel();
          }}
        >
          {isEditing ? (
            <>
              <input
                className={`flags-table__input${isDuplicate ? ' flags-table__input--error' : ''}`}
                value={flag.name}
                onChange={e => onChange({ ...flag, name: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter' && !isDuplicate) onAccept(); }}
                placeholder="Flag Name"
                autoFocus
              />
              <Button onClick={onAccept}>✓</Button>
              <Button onClick={onCancel}>✗</Button>
            </>
          ) : (
            <>
              <span className="flags-table__name">{flag.name}</span>
              <Button onClick={onEdit}>Edit</Button>
            </>
          )}
        </div>
      </td>
      <td>
        <span className="flags-table__key">{flag.id}</span>
      </td>
      <td>
        <input
          className="flags-table__input"
          value={flag.group ?? ''}
          onChange={e => onGroupChange(e.target.value)}
          onBlur={onGroupCommit}
          placeholder="(ungrouped)"
        />
      </td>
      <td className="flags-table__center">
        <input
          type="checkbox"
          checked={flag.defaultActive ?? false}
          onChange={e => onDefaultActiveChange(e.target.checked)}
        />
      </td>
      <td>
        <Button variant="danger" onClick={onDelete}>Delete</Button>
      </td>
    </tr>
  );
}

interface EditingState {
  index: number;
  original: FlagDefinition;
}

export function FlagsPage({ projectId, projectName, onBack }: FlagsPageProps) {
  const [flags, setFlags] = useState<FlagDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [inUseModal, setInUseModal] = useState<{ flagName: string; scenes: string[]; rules: string[] } | null>(null);

  useEffect(() => {
    flagsApi.list(projectId)
      .then(data => { setFlags(data); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, [projectId]);

  const duplicateKeys = useMemo(() => {
    const indicesByKey = new Map<string, number[]>();
    flags.forEach((flag, index) => {
      if (flag.id) {
        const existing = indicesByKey.get(flag.id) ?? [];
        existing.push(index);
        indicesByKey.set(flag.id, existing);
      }
    });
    const duplicateIndices = new Set<number>();
    indicesByKey.forEach(indices => {
      if (indices.length > 1) indices.forEach(index => duplicateIndices.add(index));
    });
    return duplicateIndices;
  }, [flags]);

  const hasDuplicates = duplicateKeys.size > 0;

  const save = useCallback(async (flagsToSave: FlagDefinition[]) => {
    setSaving(true);
    setError(null);
    try {
      await flagsApi.save(projectId, flagsToSave);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  const updateFlag = useCallback((index: number, updated: FlagDefinition) => {
    setFlags(prev => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  const handleDefaultActiveChange = useCallback((index: number, defaultActive: boolean) => {
    const newFlags = flags.map((flag, i) => i === index ? { ...flag, defaultActive } : flag);
    setFlags(newFlags);
    save(newFlags);
  }, [flags, save]);

  const handleGroupChange = useCallback((index: number, group: string) => {
    setFlags(prev => prev.map((flag, i) => i === index ? { ...flag, group } : flag));
  }, []);

  const handleGroupCommit = useCallback(() => {
    save(flags);
  }, [flags, save]);

  const startEditing = useCallback((index: number) => {
    if (editingState !== null) {
      setFlags(prev => {
        const next = [...prev];
        next[editingState.index] = editingState.original;
        return next;
      });
    }
    setEditingState({ index, original: flags[index] });
  }, [editingState, flags]);

  const acceptEditing = useCallback(() => {
    setEditingState(null);
    save(flags);
  }, [flags, save]);

  const cancelEditing = useCallback(() => {
    if (editingState === null) return;
    setFlags(prev => {
      const next = [...prev];
      next[editingState.index] = editingState.original;
      return next;
    });
    setEditingState(null);
  }, [editingState]);

  const deleteFlag = useCallback(async (index: number) => {
    const flag = flags[index];
    if (flag.id) {
      const usage = await flagsApi.checkUsage(projectId, flag.id).catch(() => null);
      if (usage && (usage.scenes.length > 0 || usage.rules.length > 0)) {
        setInUseModal({ flagName: flag.name, scenes: usage.scenes, rules: usage.rules });
        return;
      }
    }
    const newFlags = flags.filter((_, i) => i !== index);
    setFlags(newFlags);
    setEditingState(prev => {
      if (prev === null || prev.index === index) return null;
      if (prev.index > index) return { ...prev, index: prev.index - 1 };
      return prev;
    });
    save(newFlags);
  }, [flags, projectId, save]);

  const addFlag = useCallback(() => {
    const existingIds = new Set(flags.map(flag => flag.id));
    const newFlag: FlagDefinition = { id: generateUniqueId(existingIds), name: '', defaultActive: false };
    const newIndex = flags.length;
    if (editingState !== null) {
      setFlags(prev => {
        const next = [...prev];
        next[editingState.index] = editingState.original;
        return [...next, newFlag];
      });
    } else {
      setFlags(prev => [...prev, newFlag]);
    }
    setEditingState({ index: newIndex, original: newFlag });
  }, [editingState, flags]);

  return (
    <>
    {inUseModal && (
      <FlagInUseModal
        flagName={inUseModal.flagName}
        scenes={inUseModal.scenes}
        rules={inUseModal.rules}
        onClose={() => setInUseModal(null)}
      />
    )}
    <PageLayout>
      <PageHeader title={`${projectName} — Flags`} left={<Button onClick={onBack}>←</Button>}>
        {saving && <span style={{ color: 'var(--color-fg-subtle)', fontSize: 'var(--text-13)' }}>Saving…</span>}
        <Button onClick={addFlag}>+ Flag</Button>
      </PageHeader>
      <PageBody>
        {loading && <p style={{ padding: 'var(--size-16)' }}>Loading…</p>}
        {error && <p style={{ padding: 'var(--size-16)', color: 'var(--color-danger)' }}>{error}</p>}
        {!loading && (
          <>
            <p style={{ padding: 'var(--size-8) var(--size-16)', color: 'var(--color-fg-subtle)', fontSize: 'var(--text-13)' }}>
              Flags are the binary on/off states that drive scene selection and sprite visibility.
            </p>
            {hasDuplicates && (
              <p style={{ padding: 'var(--size-8) var(--size-16)', color: 'var(--color-danger)', fontSize: 'var(--text-13)' }}>
                Duplicate flag names detected — each flag must have a unique name.
              </p>
            )}
            {flags.length === 0 ? (
              <p style={{ padding: 'var(--size-16)', color: 'var(--color-fg-faint)' }}>No flags defined yet. Click &ldquo;+ Flag&rdquo; to add one.</p>
            ) : (
              <table className="flags-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Key</th>
                    <th>Group</th>
                    <th className="flags-table__center">Default Active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map((flag, i) => (
                    <FlagRow
                      key={i}
                      flag={flag}
                      isEditing={editingState?.index === i}
                      isDuplicate={duplicateKeys.has(i)}
                      onEdit={() => startEditing(i)}
                      onAccept={acceptEditing}
                      onCancel={cancelEditing}
                      onChange={updated => updateFlag(i, updated)}
                      onDefaultActiveChange={checked => handleDefaultActiveChange(i, checked)}
                      onGroupChange={group => handleGroupChange(i, group)}
                      onGroupCommit={handleGroupCommit}
                      onDelete={() => deleteFlag(i)}
                    />
                  ))}
                </tbody>
              </table>
            )}
            {flags.length > 0 && (
              <div style={{ padding: 'var(--size-12) var(--size-16)' }}>
                <Button onClick={addFlag}>+ Flag</Button>
              </div>
            )}
          </>
        )}
      </PageBody>
    </PageLayout>
    </>
  );
}
