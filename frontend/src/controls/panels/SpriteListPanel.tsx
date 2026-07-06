import React, { useState } from 'react';
import { Eye, EyeOff, MoreHorizontal, Plus } from 'lucide-react';
import { CreateSpriteModal } from '../modals/CreateSpriteModal';
import { SectionHeading } from './SectionHeading';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../../components/ui/alert-dialog';
import './SpriteListPanel.scss';

export interface SpriteEntry {
  id?: string;
  name: string;
  visible: boolean;
  parallaxMultiplier: number;
}

interface SpriteListPanelProps {
  entries: SpriteEntry[];
  projectId: string;
  selectedName: string | null;
  onToggle: (index: number) => void;
  onSelect: (index: number) => void;
  onAdd: (textureResource: string) => void;
  onChangeTexture: (index: number, textureResource: string) => void;
  onDelete: (index: number) => void;
  onEditTexture: (index: number) => void;
  onRename: (index: number, newName: string) => void;
  onEditConditions?: (index: number) => void;
}

export function ThumbnailChip({ selected, className = '' }: { selected: boolean; className?: string }) {
  return (
    <span className={`thumbnail-chip ${selected ? 'thumbnail-chip--selected' : ''} ${className}`.trim()} />
  );
}

export function SpriteListPanel({ entries, projectId, selectedName, onToggle, onSelect, onAdd, onChangeTexture, onDelete, onEditTexture, onRename, onEditConditions }: SpriteListPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [changeTextureIndex, setChangeTextureIndex] = useState<number | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const commitRename = () => {
    if (editingIndex !== null) {
      const trimmed = editingValue.trim();
      if (trimmed) onRename(editingIndex, trimmed);
    }
    setEditingIndex(null);
  };

  const handleImageSelected = (filename: string) => {
    if (changeTextureIndex !== null) {
      onChangeTexture(changeTextureIndex, filename);
      setChangeTextureIndex(null);
    } else {
      onAdd(filename);
    }
    setShowModal(false);
  };

  const handleDeleteConfirm = () => {
    if (confirmDeleteIndex !== null) {
      onDelete(confirmDeleteIndex);
    }
    setConfirmDeleteIndex(null);
  };

  return (
    <div>
      <SectionHeading
        action={(
          <button
            type="button"
            onClick={() => setShowModal(true)}
            title="Add sprite"
            className="sprite-list-add-btn"
          >
            <Plus size={13} />
          </button>
        )}
      >
        Sprites <span className="sprite-list-count">· {entries.length}</span>
      </SectionHeading>
      <div className="sprite-list">
      {entries.map((entry, index) => {
        const selected = entry.name === selectedName;
        return (
          <div
            key={index}
            className={`sprite-list-item ${!entry.visible ? 'sprite-list-item--hidden' : ''} ${selected ? 'sprite-list-item--selected' : ''}`.trim()}
            onClick={() => onSelect(index)}
          >
            <span
              onClick={(e) => { e.stopPropagation(); onToggle(index); }}
              className="sprite-list-item__eye"
            >
              {entry.visible ? <Eye size={13} /> : <EyeOff size={13} />}
            </span>

            <ThumbnailChip selected={selected} />

            {editingIndex === index ? (
              <input
                className="sprite-list-item__name-input"
                value={editingValue}
                autoFocus
                onClick={e => e.stopPropagation()}
                onChange={e => setEditingValue(e.target.value)}
                onFocus={e => e.target.select()}
                onBlur={commitRename}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') setEditingIndex(null);
                }}
              />
            ) : (
              <span
                className="sprite-list-item__name"
                title="Double-click to rename"
                onDoubleClick={e => {
                  e.stopPropagation();
                  setEditingIndex(index);
                  setEditingValue(entry.name);
                }}
              >
                {entry.name || `Sprite ${index}`}
              </span>
            )}

            <span className="sprite-list-item__parallax">
              {entry.parallaxMultiplier.toFixed(1)}×
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={e => e.stopPropagation()}
                  className="sprite-list-item__menu-trigger"
                >
                  <MoreHorizontal size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => { setEditingIndex(index); setEditingValue(entry.name); }}>
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setChangeTextureIndex(index); setShowModal(true); }}>
                  Change Texture
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onEditTexture(index)}>
                  Edit Texture
                </DropdownMenuItem>
                {onEditConditions && (
                  <DropdownMenuItem onSelect={() => onEditConditions(index)}>
                    Conditions
                  </DropdownMenuItem>
                )}
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

      <AlertDialog open={confirmDeleteIndex !== null} onOpenChange={(open) => { if (!open) setConfirmDeleteIndex(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle className="sprite-delete-dialog__title">Delete sprite?</AlertDialogTitle>
          <AlertDialogDescription className="sprite-delete-dialog__description">
            Delete <strong>{confirmDeleteIndex !== null ? (entries[confirmDeleteIndex]?.name || `Sprite ${confirmDeleteIndex}`) : ''}</strong>? This can't be undone.
          </AlertDialogDescription>
          <div className="sprite-delete-dialog__actions">
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
          onClose={() => { setShowModal(false); setChangeTextureIndex(null); }}
          projectId={projectId}
        />
      )}
    </div>
  );
}
