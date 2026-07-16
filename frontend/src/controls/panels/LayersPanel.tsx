import React, { useState } from 'react';
import { Box, Check, ChevronDown, ChevronRight, Eye, EyeOff, MoreHorizontal, Plus, Square } from 'lucide-react';
import type { SceneSlot, SlotOption } from '@livewallpaper/types';
import { isNoneOption } from '../../slotOps';
import { CreateSpriteModal } from '../modals/CreateSpriteModal';
import { ThumbnailChip, type SpriteEntry } from './SpriteListPanel';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../../components/ui/alert-dialog';
import './LayersPanel.scss';

interface LayersPanelProps {
  /** Base sprites, front → back (drawn under the slots). */
  sprites: SpriteEntry[];
  /** Variable layers. Drawn in front of the base sprites (see sceneResolver), so listed first. */
  slots: SceneSlot[];
  projectId: string;
  selectedSpriteName: string | null;
  selectedSlotId: string | null;
  expandedSlotIds: ReadonlySet<string>;
  /**
   * Whether an option is currently eligible under the preview flag state. Ungated options are
   * always eligible; a gated option shows a green check only while eligible. Omit to hide the
   * eligibility column entirely (e.g. before any flag context exists).
   */
  isOptionEligible?: (slotId: string, option: SlotOption) => boolean;
  onSelectSprite: (index: number) => void;
  onToggleSprite: (index: number) => void;
  onAddSprite: (textureResource: string) => void;
  onChangeTexture: (index: number, textureResource: string) => void;
  onDeleteSprite: (index: number) => void;
  onEditTexture: (index: number) => void;
  onRenameSprite: (index: number, newName: string) => void;
  onSelectSlot: (slotId: string) => void;
  onToggleSlotExpand: (slotId: string) => void;
  /** Select a slot and preview one of its options (replaces the old floating cycler). */
  onSelectOption: (slotId: string, optionId: string) => void;
  /** Option id currently previewed for the selected slot, highlighted in the list. */
  previewedOptionId?: string | null;
  onRenameOption: (slotId: string, optionId: string, name: string) => void;
  onChangeOptionTexture: (slotId: string, optionId: string, textureResource: string) => void;
  onEditOptionTexture: (slotId: string, optionId: string) => void;
  onDeleteOption: (slotId: string, optionId: string) => void;
  onAddSlot: () => void;
}

/** Whether an option carries any eligibility gate (vs. being always eligible). */
function isGated(option: SlotOption): boolean {
  return (option.conditions?.checks.length ?? 0) > 0;
}

export function LayersPanel({
  sprites,
  slots,
  projectId,
  selectedSpriteName,
  selectedSlotId,
  expandedSlotIds,
  isOptionEligible,
  onSelectSprite,
  onToggleSprite,
  onAddSprite,
  onChangeTexture,
  onDeleteSprite,
  onEditTexture,
  onRenameSprite,
  onSelectSlot,
  onToggleSlotExpand,
  onSelectOption,
  previewedOptionId,
  onRenameOption,
  onChangeOptionTexture,
  onEditOptionTexture,
  onDeleteOption,
  onAddSlot,
}: LayersPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [changeTextureIndex, setChangeTextureIndex] = useState<number | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  // Per-option (slot sprite) edit state, mirroring the base-sprite rename/texture/delete flows.
  const [changeTextureOption, setChangeTextureOption] = useState<{ slotId: string; optionId: string } | null>(null);
  const [confirmDeleteOption, setConfirmDeleteOption] = useState<{ slotId: string; optionId: string; name: string } | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionValue, setEditingOptionValue] = useState('');

  const commitOptionRename = (slotId: string, optionId: string) => {
    const trimmed = editingOptionValue.trim();
    if (trimmed) onRenameOption(slotId, optionId, trimmed);
    setEditingOptionId(null);
  };

  const commitRename = () => {
    if (editingIndex !== null) {
      const trimmed = editingValue.trim();
      if (trimmed) onRenameSprite(editingIndex, trimmed);
    }
    setEditingIndex(null);
  };

  const handleImageSelected = (filename: string) => {
    if (changeTextureOption) {
      onChangeOptionTexture(changeTextureOption.slotId, changeTextureOption.optionId, filename);
      setChangeTextureOption(null);
    } else if (changeTextureIndex !== null) {
      onChangeTexture(changeTextureIndex, filename);
      setChangeTextureIndex(null);
    } else {
      onAddSprite(filename);
    }
    setShowModal(false);
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteIndex !== null) onDeleteSprite(confirmDeleteIndex);
    setConfirmDeleteIndex(null);
  };

  return (
    <div className="layers-panel">
      <div className="layers-panel__header">
        <span className="layers-panel__title">Layers</span>
        <span className="layers-panel__sublabel">front → back</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" title="Add layer or slot" className="layers-panel__add-btn">
              <Plus size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { setChangeTextureIndex(null); setShowModal(true); }}>
              Add sprite
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onAddSlot}>
              Add slot
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="layers-panel__list">
        {slots.map((slot) => {
          const selected = slot.id === selectedSlotId;
          const expanded = expandedSlotIds.has(slot.id);
          return (
            <div
              key={slot.id}
              className={`layers-slot ${selected ? 'layers-slot--selected' : ''}`.trim()}
            >
              <div
                className="layers-slot__header"
                onClick={() => onSelectSlot(slot.id)}
              >
                <span
                  className="layers-slot__chevron"
                  onClick={(e) => { e.stopPropagation(); onToggleSlotExpand(slot.id); }}
                >
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
                <span className="layers-slot__glyph"><Box size={13} /></span>
                <span className="layers-slot__name">{slot.name}</span>
                <span className="layers-slot__count">{slot.options.length} sprites</span>
              </div>

              {expanded && (
                <div className="layers-slot__options">
                  {slot.options.map((option) => {
                    const gated = isGated(option);
                    const eligible = isOptionEligible ? isOptionEligible(slot.id, option) : true;
                    const previewed = selected && option.id === previewedOptionId;
                    const none = isNoneOption(option);
                    const editing = editingOptionId === option.id;
                    return (
                      <div
                        key={option.id}
                        className={`layers-option ${previewed ? 'layers-option--previewed' : ''}`.trim()}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectOption(slot.id, option.id)}
                        onKeyDown={(e) => {
                          // Only the row itself drives select — ignore keys bubbling from the rename input.
                          if (e.target !== e.currentTarget) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectOption(slot.id, option.id);
                          }
                        }}
                      >
                        <span className={`layers-option__swatch ${!gated && !option.sprites?.length ? 'layers-option__swatch--none' : ''}`.trim()} />
                        {editing ? (
                          <input
                            className="layers-option__name-input"
                            value={editingOptionValue}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingOptionValue(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => commitOptionRename(slot.id, option.id)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') commitOptionRename(slot.id, option.id);
                              if (e.key === 'Escape') setEditingOptionId(null);
                            }}
                          />
                        ) : (
                          <span
                            className="layers-option__name"
                            title={none ? undefined : 'Double-click to rename'}
                            onDoubleClick={none ? undefined : (e) => {
                              e.stopPropagation();
                              setEditingOptionId(option.id);
                              setEditingOptionValue(option.name);
                            }}
                          >
                            {option.name}
                          </span>
                        )}
                        {isOptionEligible && (
                          <span className="layers-option__status">
                            {!gated ? (
                              <span className="layers-option__always">always</span>
                            ) : eligible ? (
                              <Check className="layers-option__check" size={9} />
                            ) : null}
                          </span>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button onClick={(e) => e.stopPropagation()} className="layers-option__menu-trigger">
                              <MoreHorizontal size={12} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            {!none && (
                              <>
                                <DropdownMenuItem onSelect={() => { setEditingOptionId(option.id); setEditingOptionValue(option.name); }}>
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => { setChangeTextureOption({ slotId: slot.id, optionId: option.id }); setShowModal(true); }}>
                                  Change Texture
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onEditOptionTexture(slot.id, option.id)}>
                                  Edit Texture
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem danger onSelect={() => setConfirmDeleteOption({ slotId: slot.id, optionId: option.id, name: option.name })}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {sprites.map((entry, index) => {
          const selected = entry.name === selectedSpriteName;
          return (
            <div
              key={`sprite-${index}`}
              className={`layers-sprite ${!entry.visible ? 'layers-sprite--hidden' : ''} ${selected ? 'layers-sprite--selected' : ''}`.trim()}
              onClick={() => onSelectSprite(index)}
            >
              <span
                onClick={(e) => { e.stopPropagation(); onToggleSprite(index); }}
                className="layers-sprite__eye"
              >
                {entry.visible ? <Eye size={13} /> : <EyeOff size={13} />}
              </span>

              <span className="layers-sprite__glyph"><Square size={12} /></span>

              <ThumbnailChip selected={selected} className="thumbnail-chip--sm" />

              {editingIndex === index ? (
                <input
                  className="layers-sprite__name-input"
                  value={editingValue}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingIndex(null);
                  }}
                />
              ) : (
                <span
                  className="layers-sprite__name"
                  title="Double-click to rename"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingIndex(index);
                    setEditingValue(entry.name);
                  }}
                >
                  {entry.name || `Sprite ${index}`}
                </span>
              )}

              <span className="layers-sprite__pill">base</span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button onClick={(e) => e.stopPropagation()} className="layers-sprite__menu-trigger">
                    <MoreHorizontal size={13} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onSelect={() => { setEditingIndex(index); setEditingValue(entry.name); }}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { setChangeTextureIndex(index); setShowModal(true); }}>
                    Change Texture
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEditTexture(index)}>
                    Edit Texture
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem danger onSelect={() => setConfirmDeleteIndex(index)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      <div className="layers-panel__footer">
        <Box size={11} />
        box = slot · plain = base sprite
      </div>

      <AlertDialog open={confirmDeleteIndex !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteIndex(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle className="sprite-delete-dialog__title">Delete sprite?</AlertDialogTitle>
          <AlertDialogDescription className="sprite-delete-dialog__description">
            Delete <strong>{confirmDeleteIndex !== null ? (sprites[confirmDeleteIndex]?.name || `Sprite ${confirmDeleteIndex}`) : ''}</strong>? This can't be undone.
          </AlertDialogDescription>
          <div className="sprite-delete-dialog__actions">
            <AlertDialogAction onClick={handleDeleteConfirm} className="sprite-delete-dialog__confirm-btn">
              Delete
            </AlertDialogAction>
            <AlertDialogCancel className="sprite-delete-dialog__cancel-btn">
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteOption !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteOption(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle className="sprite-delete-dialog__title">Delete sprite?</AlertDialogTitle>
          <AlertDialogDescription className="sprite-delete-dialog__description">
            Remove <strong>{confirmDeleteOption?.name ?? ''}</strong> from this slot? This can't be undone.
          </AlertDialogDescription>
          <div className="sprite-delete-dialog__actions">
            <AlertDialogAction
              onClick={() => { if (confirmDeleteOption) onDeleteOption(confirmDeleteOption.slotId, confirmDeleteOption.optionId); setConfirmDeleteOption(null); }}
              className="sprite-delete-dialog__confirm-btn"
            >
              Delete
            </AlertDialogAction>
            <AlertDialogCancel className="sprite-delete-dialog__cancel-btn">
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {showModal && (
        <CreateSpriteModal
          onSelect={handleImageSelected}
          onClose={() => { setShowModal(false); setChangeTextureIndex(null); setChangeTextureOption(null); }}
          projectId={projectId}
        />
      )}
    </div>
  );
}
