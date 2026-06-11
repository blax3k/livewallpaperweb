import React, { useState, useEffect } from 'react';
import './SceneCard.scss';

interface SceneCardProps {
  label: string;
  thumbnail_url?: string;
  selected?: boolean;
  onClick?: () => void;
  thumbBuster?: number;
}

export function SceneCard({ label, thumbnail_url, selected, onClick, thumbBuster = 0 }: SceneCardProps) {
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
  }, [thumbnail_url, thumbBuster]);

  const thumbnailSrc = thumbnail_url
    ? `${thumbnail_url}${thumbnail_url.includes('?') ? '&' : '?'}v=${thumbBuster}`
    : null;

  return (
    <div
      className={`scene-card${selected ? ' scene-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="scene-card-preview">
        {thumbnailSrc && !thumbFailed ? (
          <img
            src={thumbnailSrc}
            alt={label}
            className="scene-card-thumb"
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <span className="scene-card-icon">🎬</span>
        )}
      </div>
      <div className="scene-card-label">{label}</div>
    </div>
  );
}
