import React, { useState, useEffect, useRef } from 'react';
import './SpriteListPanel.scss';
import { ImageLibraryModal } from './ImageLibraryModal';

export interface SpriteEntry {
  id?: string;
  name: string;
  visible: boolean;
  parallaxMultiplier: number;
}

interface SpriteListPanelProps {
  entries: SpriteEntry[];
  selectedName: string | null;
  onToggle: (index: number) => void;
  onSelect: (index: number) => void;
  onAdd: (textureResource: string) => void;
  onChangeTexture: (index: number, textureResource: string) => void;
  onDelete: (index: number) => void;
  onEditTexture: (index: number) => void;
  onRename: (index: number, newName: string) => void;
}

export function SpriteListPanel({ entries, selectedName, onToggle, onSelect, onAdd, onChangeTexture, onDelete, onEditTexture, onRename }: SpriteListPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [changeTextureIndex, setChangeTextureIndex] = useState<number | null>(null);
  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the popover when clicking outside it
  useEffect(() => {
    if (menuOpenIndex === null) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenIndex]);

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
    <div id="sprite-list-panel">
      <div className="sprite-list-title">
        <span>Sprites ({entries.length})</span>
        <button className="sprite-list-add-btn" onClick={() => setShowModal(true)} title="Add sprite">+</button>
      </div>
      <div className="sprite-list">
        {entries.map((entry, index) => (
          <div
            key={index}
            className={`sprite-list-item${entry.name === selectedName ? ' sprite-list-item--selected' : ''}`}
            onClick={() => onSelect(index)}
          >
            <span
              className="sprite-eye-icon"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(index);
              }}
            >
              {entry.visible ? '👁️' : '🚫'}
            </span>
            {editingIndex === index ? (
              <input
                className="sprite-label-input"
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
                className="sprite-label"
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
            <span className="sprite-parallax">{entry.parallaxMultiplier.toFixed(2)}</span>
            <span
              className="sprite-menu-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenIndex(menuOpenIndex === index ? null : index);
              }}
            >
              &#8943;
            </span>
            {menuOpenIndex === index && (
              <div
                className="sprite-menu-popover"
                ref={menuRef}
                onClick={e => e.stopPropagation()}
              >
                <button
                className="sprite-menu-item"
                onClick={() => {
                  setMenuOpenIndex(null);
                  setEditingIndex(index);
                }}>
                  Rename
                </button>
                <button
                  className="sprite-menu-item"
                  onClick={() => {
                    setMenuOpenIndex(null);
                    setChangeTextureIndex(index);
                    setShowModal(true);
                  }}
                >
                  Change Texture
                </button>
                <button
                  className="sprite-menu-item"
                  onClick={() => {
                    setMenuOpenIndex(null);
                    onEditTexture(index);
                  }}
                >
                  Edit Texture
                </button>
                <button
                  className="sprite-menu-item sprite-menu-item--danger"
                  onClick={() => {
                    setMenuOpenIndex(null);
                    setConfirmDeleteIndex(index);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {confirmDeleteIndex !== null && (
        <div className="add-sprite-overlay">
          <div className="sprite-confirm-dialog">
            <p>Delete <strong>{entries[confirmDeleteIndex]?.name || `Sprite ${confirmDeleteIndex}`}</strong>?</p>
            <div className="sprite-confirm-actions">
              <button className="sprite-confirm-yes" onClick={handleDeleteConfirm}>Yes</button>
              <button className="sprite-confirm-no" onClick={() => setConfirmDeleteIndex(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ImageLibraryModal
          onSelect={handleImageSelected}
          onClose={() => { setShowModal(false); setChangeTextureIndex(null); }}
        />
      )}
    </div>
  );
}
