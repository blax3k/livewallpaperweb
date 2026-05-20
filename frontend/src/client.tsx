import './styles/main.scss';
import React, { useState, useCallback, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ScenePage } from './ScenePage';
import { SceneListPage } from './SceneListPage';
import { ProjectListPage } from './ProjectListPage';

interface ProjectRecord {
  id: string;
  name: string;
}

type Page =
  | { type: 'projects' }
  | { type: 'scenes'; project: ProjectRecord }
  | { type: 'scene'; sceneName: string; project: ProjectRecord };

function pageFromPath(): Page {
  const sceneMatch = window.location.pathname.match(/^\/scene\/([^/]+)$/);
  if (sceneMatch) {
    // We don't have project context from the URL alone; fall back to projects root
    return { type: 'projects' };
  }
  const projectMatch = window.location.pathname.match(/^\/project\/([^/]+)$/);
  if (projectMatch) {
    // We only have the id from the URL; name will be resolved on load
    return { type: 'scenes', project: { id: decodeURIComponent(projectMatch[1]), name: '' } };
  }
  return { type: 'projects' };
}

function App() {
  const [page, setPage] = useState<Page>(pageFromPath);
  const [thumbBuster, setThumbBuster] = useState(0);

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToProject = useCallback((project: ProjectRecord) => {
    window.history.pushState(null, '', `/project/${encodeURIComponent(project.id)}`);
    setPage({ type: 'scenes', project });
  }, []);

  const navigateToScene = useCallback((sceneName: string, project: ProjectRecord) => {
    window.history.pushState(null, '', `/scene/${encodeURIComponent(sceneName)}`);
    setPage({ type: 'scene', sceneName, project });
  }, []);

  const navigateBackToProjects = useCallback(() => {
    window.history.pushState(null, '', '/');
    setPage({ type: 'projects' });
  }, []);

  const navigateBackToScenes = useCallback((project: ProjectRecord) => {
    window.history.pushState(null, '', `/project/${encodeURIComponent(project.id)}`);
    setPage({ type: 'scenes', project });
  }, []);

  const handleSaved = useCallback(() => setThumbBuster(b => b + 1), []);

  if (page.type === 'scene') {
    return (
      <ScenePage
        initialScene={page.sceneName}
        onBack={() => navigateBackToScenes(page.project)}
        onSaved={handleSaved}
      />
    );
  }

  if (page.type === 'scenes') {
    return (
      <SceneListPage
        onSelect={(sceneName) => navigateToScene(sceneName, page.project)}
        onBack={navigateBackToProjects}
        projectId={page.project.id}
        thumbBuster={thumbBuster}
      />
    );
  }

  return <ProjectListPage onSelect={navigateToProject} />;
}

window.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.body);
  root.render(<App />);
});
