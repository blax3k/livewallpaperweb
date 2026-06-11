import React, { useState, useEffect, useRef } from 'react';
import './NewSceneDialog.scss';
import { Button } from '../components/Button';
import { SceneCard } from '../components/SceneCard';

interface SceneChoice {
  id: string;
  label: string;
  thumbnail_url?: string;
}

interface NewSceneDialogProps {
  onConfirm: (name: string, copyFromSceneId?: string) => void;
  onCancel: () => void;
  scenes?: SceneChoice[];
}

export function NewSceneDialog({ onConfirm, onCancel, scenes = [] }: NewSceneDialogProps) {
  const [name, setName] = useState('');
  const [copyFromId, setCopyFromId] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onConfirm(trimmed, copyFromId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="new-scene-overlay" onKeyDown={handleKeyDown}>
      <div className="new-scene-dialog">
        <h2 className="new-scene-title">New Scene</h2>
        <form onSubmit={handleSubmit}>
          <div className="new-scene-field">
            <label htmlFor="new-scene-name">Scene name</label>
            <input
              id="new-scene-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter scene name"
            />
          </div>
          <div className="new-scene-field">
            <label>Copy from</label>
            <div className="new-scene-copy-grid">
              <SceneCard
                label="Blank"
                selected={copyFromId === undefined}
                onClick={() => setCopyFromId(undefined)}
              />
              {scenes.map(scene => (
                <SceneCard
                  key={scene.id}
                  label={scene.label}
                  thumbnail_url={scene.thumbnail_url}
                  selected={copyFromId === scene.id}
                  onClick={() => setCopyFromId(scene.id)}
                />
              ))}
            </div>
          </div>
          <div className="new-scene-actions">
            <Button type="button" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!name.trim()}>OK</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
