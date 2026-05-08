import React from 'react';
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
}

export function SpriteListPanel({ entries, selectedName, onToggle, onSelect }: SpriteListPanelProps) {
  return (
    <div id="sprite-list-panel">
      <div className="sprite-list-title">Sprites ({entries.length})</div>
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
    </div>
  );
}
