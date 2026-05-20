import './styles/main.scss';
import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ScenePage } from './ScenePage';
import { SceneListPage } from './SceneListPage';

type Page = { type: 'list' } | { type: 'scene'; sceneName: string };

function pageFromPath(): Page {
  const match = window.location.pathname.match(/^\/scene\/([^/]+)$/);
  return match ? { type: 'scene', sceneName: decodeURIComponent(match[1]) } : { type: 'list' };
}

function App() {
  const [page, setPage] = useState<Page>(pageFromPath);
  const [thumbBuster, setThumbBuster] = useState(0);

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToScene = useCallback((sceneName: string) => {
    window.history.pushState(null, '', `/scene/${encodeURIComponent(sceneName)}`);
    setPage({ type: 'scene', sceneName });
  }, []);

  const navigateBack = useCallback(() => {
    window.history.pushState(null, '', '/');
    setPage({ type: 'list' });
  }, []);

  const handleSaved = useCallback(() => setThumbBuster(b => b + 1), []);

  if (page.type === 'scene') {
    return (
      <ScenePage
        initialScene={page.sceneName}
        onBack={navigateBack}
        onSaved={handleSaved}
      />
    );
  }

  return <SceneListPage onSelect={navigateToScene} thumbBuster={thumbBuster} />;
}

window.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.body);
  root.render(<App />);
});
