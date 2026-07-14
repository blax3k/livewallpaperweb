import React, { useState } from 'react';
import { Ban, Box, Check, Dices, ImageOff, MoreHorizontal, Plus, X } from 'lucide-react';
import type { FlagDefinition, SceneSlot, SlotOption } from '@livewallpaper/types';
import { CreateSpriteModal } from '../modals/CreateSpriteModal';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../../components/ui/alert-dialog';
import { getShowFlagIds, getHideFlagIds, isNoneOption } from '../../slotOps';
import './SlotEditorPanel.scss';

interface SlotEditorPanelProps {
  slot: SceneSlot | null;
  availableFlags: FlagDefinition[];
  projectId: string;
  isOptionEligible: (option: SlotOption) => boolean;
  onRenameSlot: (slotId: string, name: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onAddOption: (slotId: string, textureResource: string) => void;
  onRemoveOption: (slotId: string, optionId: string) => void;
  onRenameOption: (slotId: string, optionId: string, name: string) => void;
  onSetGates: (slotId: string, optionId: string, showFlagIds: string[], hideFlagIds: string[]) => void;
}

export function SlotEditorPanel({
  slot,
  availableFlags,
  projectId,
  isOptionEligible,
  onRenameSlot,
  onDeleteSlot,
  onAddOption,
  onRemoveOption,
  onRenameOption,
  onSetGates,
}: SlotEditorPanelProps) {
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);
  const [editingSlotName, setEditingSlotName] = useState(false);
  const [slotNameValue, setSlotNameValue] = useState('');
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [optionNameValue, setOptionNameValue] = useState('');
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState(false);
  const [confirmDeleteOptionId, setConfirmDeleteOptionId] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);

  if (!slot) {
    return (
      <div className="slot-editor-panel">
        <div className="slot-editor-panel__empty">Select a slot to edit its sprites.</div>
      </div>
    );
  }

  const noneOption = slot.options.find(isNoneOption) ?? null;
  const spriteOptions = slot.options.filter(o => !isNoneOption(o));

  const commitSlotRename = () => {
    const trimmed = slotNameValue.trim();
    if (trimmed) onRenameSlot(slot.id, trimmed);
    setEditingSlotName(false);
  };

  const commitOptionRename = (optionId: string) => {
    const trimmed = optionNameValue.trim();
    if (trimmed) onRenameOption(slot.id, optionId, trimmed);
    setEditingOptionId(null);
  };

  const handleImageSelected = (filename: string) => {
    onAddOption(slot.id, filename);
    setShowImagePicker(false);
  };

  return (
    <div className="slot-editor-panel">
      {/* Slot header */}
      <div className="slot-editor-panel__header">
        <span className="slot-editor-panel__glyph"><Box size={14} /></span>
        {editingSlotName ? (
          <input
            className="slot-editor-panel__name-input"
            value={slotNameValue}
            autoFocus
            onChange={e => setSlotNameValue(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={commitSlotRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitSlotRename();
              if (e.key === 'Escape') setEditingSlotName(false);
            }}
          />
        ) : (
          <span
            className="slot-editor-panel__name"
            title="Double-click to rename"
            onDoubleClick={() => { setEditingSlotName(true); setSlotNameValue(slot.name); }}
          >
            {slot.name}
          </span>
        )}
        <span className="slot-editor-panel__sublabel">slot</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="slot-editor-panel__kebab" title="Rename / delete slot">
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { setEditingSlotName(true); setSlotNameValue(slot.name); }}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem danger onSelect={() => setConfirmDeleteSlot(true)}>
              Delete slot
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sprites section */}
      <div className="slot-editor-panel__section">
        <div className="slot-editor-panel__section-head">
          <span className="slot-editor-panel__section-label">Sprites</span>
          <span className="slot-editor-panel__section-count">{slot.options.length}</span>
          <span className="slot-editor-panel__equal-odds" title="Every eligible sprite has an equal chance each wake">
            <Dices size={10} /> equal odds
          </span>
        </div>

        {/* Pinned none option */}
        {noneOption && (
          <div className="slot-option slot-option--none">
            <span className="slot-option__swatch slot-option__swatch--none"><ImageOff size={11} /></span>
            <div className="slot-option__body">
              <div className="slot-option__title">
                none <span className="slot-option__empty-chip">empty</span>
              </div>
              <div className="slot-option__subtitle">always eligible · no gates</div>
            </div>
          </div>
        )}

        {spriteOptions.map((option) => {
          const expanded = expandedOptionId === option.id;
          const showFlags = getShowFlagIds(option);
          const hideFlags = getHideFlagIds(option);
          const eligible = isOptionEligible(option);
          return (
            <div key={option.id} className={`slot-option ${expanded ? 'slot-option--expanded' : ''}`.trim()}>
              <div
                className="slot-option__row"
                onClick={() => setExpandedOptionId(expanded ? null : option.id)}
              >
                <span className={`slot-option__swatch ${eligible ? '' : 'slot-option__swatch--ineligible'}`.trim()} />
                <div className="slot-option__body">
                  {editingOptionId === option.id ? (
                    <input
                      className="slot-option__name-input"
                      value={optionNameValue}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                      onChange={e => setOptionNameValue(e.target.value)}
                      onFocus={e => e.target.select()}
                      onBlur={() => commitOptionRename(option.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitOptionRename(option.id);
                        if (e.key === 'Escape') setEditingOptionId(null);
                      }}
                    />
                  ) : (
                    <div className="slot-option__title">{option.name}</div>
                  )}
                  {expanded ? (
                    <div className="slot-option__subtitle slot-option__subtitle--editing">editing eligibility</div>
                  ) : (
                    <div className="slot-option__gate-summary">
                      {showFlags.length === 0 && hideFlags.length === 0 && (
                        <span className="slot-option__gate-none">always eligible</span>
                      )}
                      {showFlags.map(id => (
                        <span key={`s-${id}`} className="slot-option__gate-chip slot-option__gate-chip--show">
                          <Check size={8} />{flagName(availableFlags, id)}
                        </span>
                      ))}
                      {hideFlags.map(id => (
                        <span key={`h-${id}`} className="slot-option__gate-chip slot-option__gate-chip--hide">
                          <Ban size={8} />{flagName(availableFlags, id)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="slot-option__kebab" onClick={e => e.stopPropagation()}>
                      <MoreHorizontal size={13} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => { setEditingOptionId(option.id); setOptionNameValue(option.name); }}>
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem danger onSelect={() => setConfirmDeleteOptionId(option.id)}>
                      Delete sprite
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {expanded && (
                <div className="slot-option__gates">
                  <GateCard
                    variant="show"
                    flagIds={showFlags}
                    availableFlags={availableFlags}
                    onChange={next => onSetGates(slot.id, option.id, next, hideFlags)}
                  />
                  <GateCard
                    variant="hide"
                    flagIds={hideFlags}
                    availableFlags={availableFlags}
                    onChange={next => onSetGates(slot.id, option.id, showFlags, next)}
                  />
                </div>
              )}
            </div>
          );
        })}

        <button className="slot-editor-panel__add-sprite" onClick={() => setShowImagePicker(true)}>
          <Plus size={12} /> Add sprite
        </button>

        <div className="slot-editor-panel__helper">
          Each wake, one sprite is chosen at random from those eligible under the current flags — all with equal chance.
        </div>
      </div>

      <AlertDialog open={confirmDeleteSlot} onOpenChange={(open) => { if (!open) setConfirmDeleteSlot(false); }}>
        <AlertDialogContent>
          <AlertDialogTitle className="sprite-delete-dialog__title">Delete slot?</AlertDialogTitle>
          <AlertDialogDescription className="sprite-delete-dialog__description">
            Delete slot <strong>{slot.name}</strong> and all its sprites? This can't be undone.
          </AlertDialogDescription>
          <div className="sprite-delete-dialog__actions">
            <AlertDialogAction onClick={() => { onDeleteSlot(slot.id); setConfirmDeleteSlot(false); }} className="sprite-delete-dialog__confirm-btn">
              Delete
            </AlertDialogAction>
            <AlertDialogCancel className="sprite-delete-dialog__cancel-btn">Cancel</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOptionId !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteOptionId(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle className="sprite-delete-dialog__title">Delete sprite?</AlertDialogTitle>
          <AlertDialogDescription className="sprite-delete-dialog__description">
            Remove <strong>{spriteOptions.find(o => o.id === confirmDeleteOptionId)?.name ?? ''}</strong> from this slot? This can't be undone.
          </AlertDialogDescription>
          <div className="sprite-delete-dialog__actions">
            <AlertDialogAction
              onClick={() => { if (confirmDeleteOptionId) onRemoveOption(slot.id, confirmDeleteOptionId); setConfirmDeleteOptionId(null); }}
              className="sprite-delete-dialog__confirm-btn"
            >
              Delete
            </AlertDialogAction>
            <AlertDialogCancel className="sprite-delete-dialog__cancel-btn">Cancel</AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {showImagePicker && (
        <CreateSpriteModal
          onSelect={handleImageSelected}
          onClose={() => setShowImagePicker(false)}
          projectId={projectId}
        />
      )}
    </div>
  );
}

function flagName(flags: FlagDefinition[], id: string): string {
  return flags.find(f => f.id === id)?.name ?? id;
}

// ── Show-when / Hide-when gate card ──────────────────────────────────────────

interface GateCardProps {
  variant: 'show' | 'hide';
  flagIds: string[];
  availableFlags: FlagDefinition[];
  onChange: (next: string[]) => void;
}

function GateCard({ variant, flagIds, availableFlags, onChange }: GateCardProps) {
  const isShow = variant === 'show';
  const title = isShow ? 'Show when' : 'Hide when';
  const hint = isShow ? 'all active' : 'any active';
  const addLabel = isShow ? '+ Require flag' : '+ Exclude flag';

  const setAt = (idx: number, id: string) => onChange(flagIds.map((f, i) => (i === idx ? id : f)));
  const removeAt = (idx: number) => onChange(flagIds.filter((_, i) => i !== idx));
  const add = () => {
    // Default to the first flag not already listed here, else the first flag.
    const next = availableFlags.find(f => !flagIds.includes(f.id)) ?? availableFlags[0];
    if (next) onChange([...flagIds, next.id]);
  };

  return (
    <div className={`gate-card gate-card--${variant}`}>
      <div className="gate-card__rail" />
      <div className="gate-card__body">
        <div className="gate-card__head">
          <span className="gate-card__icon">{isShow ? <Check size={12} /> : <Ban size={12} />}</span>
          <span className="gate-card__title">{title}</span>
          <span className="gate-card__hint">{hint}</span>
        </div>
        {flagIds.map((id, idx) => (
          <div key={idx} className="gate-card__flag-row">
            <Select value={id} onValueChange={v => setAt(idx, v)}>
              <SelectTrigger className="gate-card__flag-select">
                <SelectValue placeholder="— flag —" />
              </SelectTrigger>
              <SelectContent>
                {availableFlags.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button className="gate-card__remove" onClick={() => removeAt(idx)} title="Remove flag">
              <X size={12} />
            </button>
          </div>
        ))}
        <button className="gate-card__add" onClick={add} disabled={availableFlags.length === 0}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}
