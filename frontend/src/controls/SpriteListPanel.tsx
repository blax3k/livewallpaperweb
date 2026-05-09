import React, { useState, useEffect } from 'react';
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

export function SpriteListPanel({ entries, selectedName, onToggle, onSelect, onAdd }: SpriteListPanelProps) {
  const [showModal, setShowModal] = useState(false);

  const handleImageSelected = (filename: string) => {
    setShowModal(false);
    onAdd(filename);
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
          </div>
        ))}
      </div>
      {showModal && <AddSpriteModal onSelect={handleImageSelected} onClose={() => setShowModal(false)} />}
    </div>
  );
}
