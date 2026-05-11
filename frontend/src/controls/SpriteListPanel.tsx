import React, { useState, useEffect, useRef } from 'react';
import './SpriteListPanel.scss';

export interface SpriteEntry {
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
  onDelete: (index: number) => void;
  onEditTexture: (index: number) => void;
}

function AddSpriteModal({ onSelect, onClose }: { onSelect: (filename: string) => void; onClose: () => void }) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/images')
      .then(r => r.json())
      .then((files: string[]) => { setImages(files); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="add-sprite-overlay" onClick={onClose}>
      <div className="add-sprite-modal" onClick={e => e.stopPropagation()}>
        <div className="add-sprite-modal-header">
          <span>Select Image</span>
          <button className="add-sprite-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="add-sprite-modal-body">
          {loading && <div className="add-sprite-loading">Loading…</div>}
          {!loading && images.length === 0 && <div className="add-sprite-loading">No images found.</div>}
          {images.map(filename => (
            <div key={filename} className="add-sprite-image-item" onClick={() => onSelect(filename)}>
              <img src={`/images/${filename}`} alt={filename} className="add-sprite-thumb" />
              <span className="add-sprite-image-name">{filename}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SpriteListPanel({ entries, selectedName, onToggle, onSelect, onAdd, onDelete, onEditTexture }: SpriteListPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
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

  const handleImageSelected = (filename: string) => {
    setShowModal(false);
    onAdd(filename);
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
            <span className="sprite-label">{entry.name || `Sprite ${index}`}</span>
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

      {showModal && <AddSpriteModal onSelect={handleImageSelected} onClose={() => setShowModal(false)} />}
    </div>
  );
}
