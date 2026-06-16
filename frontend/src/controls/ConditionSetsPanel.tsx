import React, { useState } from 'react';
import './ConditionSetsPanel.scss';
import type { SpriteConditionBlock, RuleConditionGroup, RuleCondition, FlagDefinition } from '@livewallpaper/types';

interface ConditionSetsPanelProps {
  spriteIndex: number;
  conditionBlocks: SpriteConditionBlock[];
  availableFlags: FlagDefinition[];
  activeConditionIndex: number | null;
  onSelectCondition: (spriteIndex: number, conditionIndex: number | null) => void;
  onAdd: (spriteIndex: number) => void;
  onRemove: (spriteIndex: number, conditionIndex: number) => void;
  onRename: (spriteIndex: number, conditionIndex: number, name: string) => void;
  onSetFlags: (spriteIndex: number, conditionIndex: number, conditions: RuleConditionGroup) => void;
}

export function ConditionSetsPanel({
  spriteIndex,
  conditionBlocks,
  availableFlags,
  activeConditionIndex,
  onSelectCondition,
  onAdd,
  onRemove,
  onRename,
  onSetFlags,
}: ConditionSetsPanelProps) {
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null);
  const [nameValue, setNameValue] = useState('');

  const commitRename = (conditionIndex: number) => {
    const trimmed = nameValue.trim();
    if (trimmed) onRename(spriteIndex, conditionIndex, trimmed);
    setEditingNameIndex(null);
  };

  const handleRowClick = (conditionIndex: number) => {
    if (activeConditionIndex === conditionIndex) {
      onSelectCondition(spriteIndex, null);
    } else {
      onSelectCondition(spriteIndex, conditionIndex);
    }
  };

  return (
    <div className="csp">
      <div className="csp__header">
        <span className="csp__title">Condition Sets</span>
        <button className="csp__add-btn" onClick={() => onAdd(spriteIndex)} title="Add condition set">+</button>
      </div>

      {conditionBlocks.length === 0 && (
        <div className="csp__empty">No condition sets. Add one to override this sprite's properties based on flags.</div>
      )}

      {conditionBlocks.map((block, i) => {
        const isActive = activeConditionIndex === i;
        return (
          <div key={i} className={`csp__set${isActive ? ' csp__set--active' : ''}`}>
            <div className="csp__set-row" onClick={() => handleRowClick(i)}>
              {editingNameIndex === i ? (
                <input
                  className="csp__name-input"
                  value={nameValue}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                  onChange={e => setNameValue(e.target.value)}
                  onBlur={() => commitRename(i)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(i);
                    if (e.key === 'Escape') setEditingNameIndex(null);
                  }}
                />
              ) : (
                <span
                  className="csp__set-name"
                  onDoubleClick={e => {
                    e.stopPropagation();
                    setEditingNameIndex(i);
                    setNameValue(block.name ?? `Set ${i + 1}`);
                  }}
                  title="Double-click to rename"
                >
                  {block.name ?? `Set ${i + 1}`}
                </span>
              )}
              <span className="csp__set-summary">
                {block.conditions?.checks.length
                  ? `${block.conditions.operator} (${block.conditions.checks.length})`
                  : 'always'}
              </span>
              <button
                className="csp__delete-btn"
                title="Remove condition set"
                onClick={e => { e.stopPropagation(); onRemove(spriteIndex, i); }}
              >
                ×
              </button>
            </div>

            {isActive && (
              <FlagConditionEditor
                spriteIndex={spriteIndex}
                conditionIndex={i}
                group={block.conditions ?? { operator: 'AND', checks: [] }}
                availableFlags={availableFlags}
                onSetFlags={onSetFlags}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Inline flag condition editor ──────────────────────────────────────────────

interface FlagConditionEditorProps {
  spriteIndex: number;
  conditionIndex: number;
  group: RuleConditionGroup;
  availableFlags: FlagDefinition[];
  onSetFlags: (spriteIndex: number, conditionIndex: number, conditions: RuleConditionGroup) => void;
}

function FlagConditionEditor({ spriteIndex, conditionIndex, group, availableFlags, onSetFlags }: FlagConditionEditorProps) {
  const update = (next: RuleConditionGroup) => onSetFlags(spriteIndex, conditionIndex, next);

  const setOperator = (op: 'AND' | 'OR') => update({ ...group, operator: op });

  const addCheck = () => {
    const firstFlag = availableFlags[0];
    const newCheck: RuleCondition = {
      type: 'flag_active',
      flagId: firstFlag?.id ?? '',
    };
    update({ ...group, checks: [...group.checks, newCheck] });
  };

  const removeCheck = (idx: number) => {
    update({ ...group, checks: group.checks.filter((_, j) => j !== idx) });
  };

  const updateCheck = (idx: number, patch: Partial<RuleCondition>) => {
    const next = group.checks.map((c, j) => j === idx ? { ...c, ...patch } : c);
    update({ ...group, checks: next });
  };

  const flagChecks = group.checks.filter(c => c.type === 'flag_active' || c.type === 'flag_inactive');

  return (
    <div className="csp__editor" onClick={e => e.stopPropagation()}>
      <div className="csp__editor-header">
        <span className="csp__editor-label">When:</span>
        <label className="csp__op-label">
          <input
            type="radio" name={`op-${spriteIndex}-${conditionIndex}`}
            checked={group.operator === 'AND'}
            onChange={() => setOperator('AND')}
          /> ALL
        </label>
        <label className="csp__op-label">
          <input
            type="radio" name={`op-${spriteIndex}-${conditionIndex}`}
            checked={group.operator === 'OR'}
            onChange={() => setOperator('OR')}
          /> ANY
        </label>
        <span className="csp__editor-label">of these flags match:</span>
      </div>

      {flagChecks.length === 0 && group.checks.length === 0 && (
        <div className="csp__no-checks">No conditions — this set always applies.</div>
      )}

      {group.checks.map((check, idx) => (
        <div key={idx} className="csp__check-row">
          <select
            className="csp__flag-select"
            value={check.flagId ?? ''}
            onChange={e => updateCheck(idx, { flagId: e.target.value })}
          >
            {availableFlags.length === 0 && <option value="">— no flags defined —</option>}
            {availableFlags.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select
            className="csp__type-select"
            value={check.type}
            onChange={e => updateCheck(idx, { type: e.target.value as RuleCondition['type'] })}
          >
            <option value="flag_active">is active</option>
            <option value="flag_inactive">is inactive</option>
          </select>
          <button className="csp__check-delete" onClick={() => removeCheck(idx)}>×</button>
        </div>
      ))}

      <button className="csp__add-check" onClick={addCheck}>+ Add condition</button>
    </div>
  );
}
