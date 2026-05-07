import './styles/main.scss';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ScenePage } from './ScenePage';
import type { SceneOption } from './SceneEditorPanel';

window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/scenes');
    const scenes: SceneOption[] = await response.json();
    const root = createRoot(document.body);
    root.render(<ScenePage scenes={scenes} />);
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});
