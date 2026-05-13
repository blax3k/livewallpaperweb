import './styles/main.scss';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ScenePage } from './ScenePage';
import type { SceneOption } from './controls/SceneEditorPanel';

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/scenes');
    const data: { name: string; label: string }[] = await response.json();
    const scenes: SceneOption[] = data.map(s => ({ value: s.name, label: s.label }));
    const root = createRoot(document.body);
    root.render(<ScenePage scenes={scenes} />);
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});
