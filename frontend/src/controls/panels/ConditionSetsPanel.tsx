import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import type { SpriteConditionBlock, RuleConditionGroup, RuleCondition, FlagDefinition } from '@livewallpaper/types';
import './ConditionSetsPanel.scss';

interface ConditionSetsPanelProps {
  spriteIndex: number;
  conditionBlocks: SpriteConditionBlock[];
  availableFlags: FlagDefinition[];
  activeConditionIndex: number | null;
  onSelectCondition: (spriteIndex: number, conditionIndex: number) => void;
  onAdd: (spriteIndex: number) => void;
  onRemove: (spriteIndex: number, conditionIndex: number) => void;
  onRename: (spriteIndex: number, conditionIndex: number, name: string) => void;
  onSetFlags: (spriteIndex: number, conditionIndex: number, conditions: RuleConditionGroup) => void;
}

function summarize(block: SpriteConditionBlock) {
  return block.conditions?.checks.length
    ? `${block.conditions.operator} (${block.conditions.checks.length})`
    : 'always';
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

  const isDefaultActive = activeConditionIndex === null || activeConditionIndex === -1;

  const handleRowClick = (conditionIndex: number) => {
    if (activeConditionIndex === conditionIndex) return;
    onSelectCondition(spriteIndex, conditionIndex);
  };

  const handleDefaultClick = () => {
    if (isDefaultActive) return;
    onSelectCondition(spriteIndex, -1);
  };

  return (
    <div className="condition-sets">
      <div
        onClick={handleDefaultClick}
        className="condition-sets__default-row"
      >
        <span className={`condition-set__dot ${isDefaultActive ? 'condition-set__dot--active' : ''}`.trim()} />
        <span className={`condition-sets__default-label ${isDefaultActive ? 'condition-sets__default-label--active' : ''}`.trim()}>Default</span>
        <span className="condition-sets__faint-summary">no checks</span>
      </div>

      {conditionBlocks.length === 0 && (
        <div className="condition-sets__empty">
          Add a condition set to override this sprite's properties based on flags.
        </div>
      )}

      {conditionBlocks.map((block, i) => {
        const isActive = activeConditionIndex === i;
        return (
          <div
            key={i}
            className={`condition-set ${isActive ? 'condition-set--active' : ''}`.trim()}
          >
            <div
              onClick={() => handleRowClick(i)}
              className="condition-set__row"
            >
              <span className={`condition-set__dot ${isActive ? 'condition-set__dot--active' : ''}`.trim()} />
              {editingNameIndex === i ? (
                <input
                  className="condition-set__name-input"
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
                  className={`condition-set__name ${isActive ? 'condition-set__name--active' : ''}`.trim()}
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
              {isActive ? (
                <span className="condition-set__previewing-label">previewing</span>
              ) : (
                <span className="condition-set__summary">{summarize(block)}</span>
              )}
              {isActive && (
                <button
                  title="Deselect"
                  onClick={e => { e.stopPropagation(); onSelectCondition(spriteIndex, -1); }}
                  className="condition-set__deselect-btn"
                >
                  <X size={12} />
                </button>
              )}
              {!isActive && (
                <button
                  title="Remove condition set"
                  onClick={e => { e.stopPropagation(); onRemove(spriteIndex, i); }}
                  className="condition-set__remove-btn"
                >
                  <X size={12} />
                </button>
              )}
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

      <button
        onClick={() => onAdd(spriteIndex)}
        className="condition-sets__add-btn"
      >
        + Add condition set
      </button>
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

  return (
    <div onClick={e => e.stopPropagation()} className="condition-editor">
      <div className="condition-editor__match-row">
        <span className="condition-editor__match-label">Match</span>
        <div className="condition-editor__match-toggle">
          <button
            onClick={() => setOperator('AND')}
            className={`condition-editor__match-btn ${group.operator === 'AND' ? 'condition-editor__match-btn--active' : ''}`.trim()}
          >
            ALL
          </button>
          <button
            onClick={() => setOperator('OR')}
            className={`condition-editor__match-btn ${group.operator === 'OR' ? 'condition-editor__match-btn--active' : ''}`.trim()}
          >
            ANY
          </button>
        </div>
      </div>

      {group.checks.length === 0 && (
        <div className="condition-editor__empty">No conditions — this set always applies.</div>
      )}

      <div className="condition-editor__checks">
        {group.checks.map((check, idx) => (
          <div key={idx} className="condition-editor__check-row">
            <Select value={check.flagId ?? ''} onValueChange={(v) => updateCheck(idx, { flagId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="— no flags —" />
              </SelectTrigger>
              <SelectContent>
                {availableFlags.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={check.type} onValueChange={(v) => updateCheck(idx, { type: v as RuleCondition['type'] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flag_active">is active</SelectItem>
                <SelectItem value="flag_inactive">is inactive</SelectItem>
              </SelectContent>
            </Select>
            <button onClick={() => removeCheck(idx)} className="condition-editor__check-remove-btn">
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addCheck}
        className="condition-editor__add-check-btn"
      >
        + Add check
      </button>
    </div>
  );
}
