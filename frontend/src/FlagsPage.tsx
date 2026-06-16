import React, { useState, useEffect, useCallback } from 'react';
import './FlagsPage.scss';
import { Button } from './components/Button';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';
import { flagsApi, type FlagDefinition } from './api';

interface FlagsPageProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
}

function generateId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

interface FlagRowProps {
  flag: FlagDefinition;
  onChange: (updated: FlagDefinition) => void;
  onDelete: () => void;
  onNameBlur: () => void;
}

function FlagRow({ flag, onChange, onDelete, onNameBlur }: FlagRowProps) {
  return (
    <tr className="flags-table__row">
      <td>
        <input
          className="flags-table__input"
          value={flag.id}
          onChange={e => onChange({ ...flag, id: e.target.value })}
          placeholder="flag_id"
          spellCheck={false}
        />
      </td>
      <td>
        <input
          className="flags-table__input"
          value={flag.name}
          onChange={e => onChange({ ...flag, name: e.target.value })}
          onBlur={onNameBlur}
          placeholder="Display Name"
        />
      </td>
      <td className="flags-table__center">
        <input
          type="checkbox"
          checked={flag.defaultActive ?? false}
          onChange={e => onChange({ ...flag, defaultActive: e.target.checked })}
        />
      </td>
      <td>
        <Button variant="danger" onClick={onDelete}>Delete</Button>
      </td>
    </tr>
  );
}

export function FlagsPage({ projectId, projectName, onBack }: FlagsPageProps) {
  const [flags, setFlags] = useState<FlagDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    flagsApi.list(projectId)
      .then(data => { setFlags(data); setLoading(false); })
      .catch(err => { setError(String(err)); setLoading(false); });
  }, [projectId]);

  const updateFlag = useCallback((index: number, updated: FlagDefinition) => {
    setFlags(prev => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
    setDirty(true);
  }, []);

  const deleteFlag = useCallback((index: number) => {
    setFlags(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  }, []);

  const addFlag = useCallback(() => {
    setFlags(prev => [...prev, { id: '', name: '', defaultActive: false }]);
    setDirty(true);
  }, []);

  const handleNameBlur = useCallback((index: number) => {
    setFlags(prev => {
      const flag = prev[index];
      if (flag && !flag.id && flag.name) {
        const next = [...prev];
        next[index] = { ...flag, id: generateId(flag.name) };
        return next;
      }
      return prev;
    });
  }, []);

  const save = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await flagsApi.save(projectId, flags);
      setDirty(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }, [projectId, flags]);

  const handleBack = useCallback(() => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    onBack();
  }, [dirty, onBack]);

  return (
    <PageLayout>
      <PageHeader title={`${projectName} — Flags`} left={<Button onClick={handleBack}>←</Button>}>
        {dirty && (
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
        <Button onClick={addFlag}>+ Flag</Button>
      </PageHeader>
      <PageBody>
        {loading && <p style={{ padding: '1rem' }}>Loading…</p>}
        {error && <p style={{ padding: '1rem', color: 'red' }}>{error}</p>}
        {!loading && (
          <>
            <p style={{ padding: '0.5rem 1rem', color: '#aaa', fontSize: '0.85rem' }}>
              Flags are the binary on/off states that drive scene selection and sprite visibility.
              The <strong>id</strong> must be a stable snake_case identifier — it is referenced by rules and scenes.
            </p>
            {flags.length === 0 ? (
              <p style={{ padding: '1rem', color: '#888' }}>No flags defined yet. Click &ldquo;+ Flag&rdquo; to add one.</p>
            ) : (
              <table className="flags-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Display Name</th>
                    <th className="flags-table__center">Default Active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map((flag, i) => (
                    <FlagRow
                      key={i}
                      flag={flag}
                      onChange={updated => updateFlag(i, updated)}
                      onDelete={() => deleteFlag(i)}
                      onNameBlur={() => handleNameBlur(i)}
                    />
                  ))}
                </tbody>
              </table>
            )}
            {flags.length > 0 && (
              <div style={{ padding: '0.75rem 1rem' }}>
                <Button onClick={addFlag}>+ Flag</Button>
              </div>
            )}
          </>
        )}
      </PageBody>
    </PageLayout>
  );
}
