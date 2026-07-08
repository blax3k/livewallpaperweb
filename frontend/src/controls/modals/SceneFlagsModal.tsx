import React, { useState, useCallback } from 'react';
import '../../SimulatorPage.scss'; // reuses modal-overlay, modal-box, modal-title, modal-footer
import './SceneFlagsModal.scss';
import { Button } from '../../components/Button';
import type { SceneFlagDeclarations, ScoredFlagEntry, FlagDefinition } from '@livewallpaper/types';

interface SceneFlagsModalProps {
  sceneName: string;
  flags: FlagDefinition[];
  declarations: SceneFlagDeclarations;
  onSave: (declarations: SceneFlagDeclarations) => void;
  onClose: () => void;
}

function FlagCheckList({
  label,
  allFlags,
  selected,
  onChange,
}: {
  label: string;
  allFlags: FlagDefinition[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  return (
    <div className="sfm-section">
      <h3 className="section-title">{label}</h3>
      <div className="sfm-checklist">
        {allFlags.map(f => (
          <label key={f.id} className="sfm-check-label">
            <input
              type="checkbox"
              checked={selected.includes(f.id)}
              onChange={() => toggle(f.id)}
            />
            <span className="sfm-flag-name">{f.name || f.id}</span>
            <code className="sfm-flag-id">{f.id}</code>
          </label>
        ))}
        {allFlags.length === 0 && <p className="sfm-empty">No flags defined. Add flags in the Flags manager.</p>}
      </div>
    </div>
  );
}

function ScoredFlagList({
  allFlags,
  scored,
  onChange,
}: {
  allFlags: FlagDefinition[];
  scored: ScoredFlagEntry[];
  onChange: (entries: ScoredFlagEntry[]) => void;
}) {
  const addEntry = () => {
    const unusedFlag = allFlags.find(f => !scored.some(e => e.flagId === f.id));
    if (!unusedFlag && allFlags.length > 0) return;
    onChange([...scored, { flagId: unusedFlag?.id ?? '', weight: 10 }]);
  };

  const updateEntry = (i: number, patch: Partial<ScoredFlagEntry>) =>
    onChange(scored.map((e, idx) => idx === i ? { ...e, ...patch } : e));

  const deleteEntry = (i: number) => onChange(scored.filter((_, idx) => idx !== i));

  return (
    <div className="sfm-section">
      <h3 className="section-title">Scored flags <span className="section-hint">(active flags add their weight to this scene's score)</span></h3>
      {scored.map((entry, i) => (
        <div key={i} className="sfm-scored-row">
          <select
            value={entry.flagId}
            onChange={e => updateEntry(i, { flagId: e.target.value })}
          >
            <option value="">— select flag —</option>
            {allFlags.map(f => <option key={f.id} value={f.id}>{f.name || f.id}</option>)}
          </select>
          <label>Weight</label>
          <input
            type="number"
            min={-100}
            max={100}
            value={entry.weight}
            onChange={e => updateEntry(i, { weight: +e.target.value })}
          />
          <button className="condition-delete" onClick={() => deleteEntry(i)} title="Remove">✕</button>
        </div>
      ))}
      <Button onClick={addEntry} disabled={allFlags.length === 0}>+ Scored Flag</Button>
    </div>
  );
}

export function SceneFlagsModal({ sceneName, flags, declarations, onSave, onClose }: SceneFlagsModalProps) {
  const [required, setRequired] = useState<string[]>(declarations.required ?? []);
  const [excluded, setExcluded] = useState<string[]>(declarations.excluded ?? []);
  const [scored, setScored] = useState<ScoredFlagEntry[]>(declarations.scored ?? []);

  const handleSave = useCallback(() => {
    const result: SceneFlagDeclarations = {};
    if (required.length > 0) result.required = required;
    if (excluded.length > 0) result.excluded = excluded;
    if (scored.length > 0) result.scored = scored;
    onSave(result);
  }, [required, excluded, scored, onSave]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box sfm-modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Scene Flags — {sceneName}</h2>
        <p className="section-hint">
          Control when this scene appears. The picker sums scored-flag weights; highest score wins.
          <br />Leave all empty for a scene that's always eligible with score 0 (legacy behaviour).
        </p>

        <FlagCheckList
          label="Required flags (scene hidden unless ALL are active)"
          allFlags={flags}
          selected={required}
          onChange={setRequired}
        />

        <ScoredFlagList
          allFlags={flags}
          scored={scored}
          onChange={setScored}
        />

        <FlagCheckList
          label="Excluded flags (scene hidden if ANY is active)"
          allFlags={flags}
          selected={excluded}
          onChange={setExcluded}
        />

        <div className="modal-footer">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
