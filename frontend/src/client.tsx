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

interface SceneRecord {
  id: string;
  name: string;
}

type Page =
  | { type: 'projects' }
  | { type: 'scenes'; project: ProjectRecord }
  | { type: 'scene'; sceneId: string; sceneName: string; project: ProjectRecord };

function pageFromPath(): Page {
  const sceneMatch = window.location.pathname.match(/^\/project\/([^/]+)\/scene\/([^/]+)$/);
  if (sceneMatch) {
    const projectId = decodeURIComponent(sceneMatch[1]);
    const sceneId = decodeURIComponent(sceneMatch[2]);
    // sceneName resolved asynchronously in App when empty
    return { type: 'scene', sceneId, sceneName: '', project: { id: projectId, name: '' } };
  }
  const projectMatch = window.location.pathname.match(/^\/project\/([^/]+)$/);
  if (projectMatch) {
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

  // Resolve sceneName from sceneId for deep links (e.g. browser forward/back or direct URL)
  const sceneIdToResolve = page.type === 'scene' && !page.sceneName ? page.sceneId : null;
  useEffect(() => {
    if (!sceneIdToResolve) return;
    fetch(`/api/scenes/id/${encodeURIComponent(sceneIdToResolve)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: SceneRecord | null) => {
        if (data?.name) {
          setPage(prev =>
            prev.type === 'scene' && prev.sceneId === sceneIdToResolve
              ? { ...prev, sceneName: data.name }
              : prev
          );
        }
      })
      .catch(() => {});
  }, [sceneIdToResolve]);

  const navigateToProject = useCallback((project: ProjectRecord) => {
    window.history.pushState(null, '', `/project/${encodeURIComponent(project.id)}`);
    setPage({ type: 'scenes', project });
  }, []);

  const navigateToScene = useCallback((scene: SceneRecord, project: ProjectRecord) => {
    window.history.pushState(null, '', `/project/${encodeURIComponent(project.id)}/scene/${encodeURIComponent(scene.id)}`);
    setPage({ type: 'scene', sceneId: scene.id, sceneName: scene.name, project });
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
    if (!page.sceneName) {
      return null; // Waiting for sceneName resolution from deep link
    }
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
        onSelect={(scene) => navigateToScene(scene, page.project)}
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
