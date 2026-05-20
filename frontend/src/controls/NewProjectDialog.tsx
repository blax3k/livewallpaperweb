import React, { useState, useEffect, useRef } from 'react';
import './NewSceneDialog.scss';

interface NewProjectDialogProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function NewProjectDialog({ onConfirm, onCancel }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onConfirm(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="new-scene-overlay" onKeyDown={handleKeyDown}>
      <div className="new-scene-dialog">
        <h2 className="new-scene-title">New Project</h2>
        <form onSubmit={handleSubmit}>
          <div className="new-scene-field">
            <label htmlFor="new-project-name">Project name</label>
            <input
              id="new-project-name"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
            />
          </div>
          <div className="new-scene-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="submit" disabled={!name.trim()}>OK</button>
          </div>
        </form>
      </div>
    </div>
  );
}
