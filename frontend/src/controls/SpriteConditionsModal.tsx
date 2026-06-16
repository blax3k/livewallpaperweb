import React, { useState, useCallback, useEffect } from 'react';
import '../RulesPage.scss';
import './SpriteConditionsModal.scss';
import { Button } from '../components/Button';
import type { SpriteConditionBlock } from '@livewallpaper/types';

const EXAMPLE = JSON.stringify(
  [
    {
      conditions: {
        operator: 'AND',
        checks: [{ type: 'flag_active', flagId: 'morning' }],
      },
      modifications: [{ type: 'visible', visible: true }],
    },
    {
      conditions: { operator: 'AND', checks: [] },
      modifications: [{ type: 'visible', visible: false }],
    },
  ],
  null,
  2,
);

interface SpriteConditionsModalProps {
  spriteName: string;
  conditions: SpriteConditionBlock[];
  onSave: (conditions: SpriteConditionBlock[]) => void;
  onClose: () => void;
}

export function SpriteConditionsModal({ spriteName, conditions, onSave, onClose }: SpriteConditionsModalProps) {
  const [text, setText] = useState(() => JSON.stringify(conditions, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    setText(JSON.stringify(conditions, null, 2));
  }, [conditions]);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    try {
      JSON.parse(value);
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleSave = useCallback(() => {
    try {
      const parsed: SpriteConditionBlock[] = JSON.parse(text);
      onSave(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  }, [text, onSave]);

  const handleClear = useCallback(() => {
    setText('[]');
    setParseError(null);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box scm-modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Conditions — {spriteName}</h2>
        <p className="section-hint">
          Condition blocks are evaluated in order; the <strong>first matching block</strong> wins.
          An empty <code>checks</code> array always matches (default fallback).
          Supported modification types: <code>visible</code>, <code>position</code>, <code>texture_coordinates</code>.
        </p>

        <textarea
          className="scm-editor"
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          spellCheck={false}
          rows={18}
        />

        {parseError && <p className="scm-error">{parseError}</p>}

        <details className="scm-example">
          <summary>Show example</summary>
          <pre>{EXAMPLE}</pre>
        </details>

        <div className="modal-footer">
          <Button onClick={handleClear}>Clear</Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!!parseError}>Save</Button>
        </div>
      </div>
    </div>
  );
}
