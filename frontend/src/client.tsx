import './styles/main.scss';
console.log('[bundle] loaded — build b85774b');
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ScenePage } from './ScenePage';
import { SceneListPage } from './SceneListPage';
import { ProjectListPage } from './ProjectListPage';
import { LoginPage } from './LoginPage';
import { authApi, setUnauthorizedHandler } from './api';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: { id: string; email: string } };

interface ProjectRecord {
  id: string;
  name: string;
}

type Page =
  | { type: 'projects' }
  | { type: 'scenes'; project: ProjectRecord }
  | { type: 'scene'; sceneId: string; project: ProjectRecord };

function pageFromPath(): Page {
  const sceneMatch = window.location.pathname.match(/^\/project\/([^/]+)\/scene\/([^/]+)$/);
  if (sceneMatch) {
    const projectId = decodeURIComponent(sceneMatch[1]);
    const sceneId = decodeURIComponent(sceneMatch[2]);
    return { type: 'scene', sceneId, project: { id: projectId, name: '' } };
  }
  const projectMatch = window.location.pathname.match(/^\/project\/([^/]+)$/);
  if (projectMatch) {
    return { type: 'scenes', project: { id: decodeURIComponent(projectMatch[1]), name: '' } };
  }
  return { type: 'projects' };
}

interface SceneRecord {
  id: string;
  name: string;
}

function App() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [page, setPage] = useState<Page>(pageFromPath);
  const [thumbBuster, setThumbBuster] = useState(0);
  const isDirtyRef = useRef(false);
  const pageRef = useRef(page);
  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => {
    setUnauthorizedHandler(() => setAuthState({ status: 'unauthenticated' }));
    authApi.me()
      .then(user => setAuthState({ status: 'authenticated', user }))
      .catch(() => {});
  }, []);

  const handleLogout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setAuthState({ status: 'unauthenticated' });
  }, []);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty;
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const currentPage = pageRef.current;

      if (currentPage.type !== 'scene' || !isDirtyRef.current) {
        setPage(pageFromPath());
        return;
      }

      if (!window.confirm('You have unsaved changes. Leave without saving?')) {
        window.history.pushState(null, '', `/project/${encodeURIComponent(currentPage.project.id)}/scene/${encodeURIComponent(currentPage.sceneId)}`);
        return;
      }

      isDirtyRef.current = false;
      setPage(pageFromPath());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToProject = useCallback((project: ProjectRecord) => {
    window.history.pushState(null, '', `/project/${encodeURIComponent(project.id)}`);
    setPage({ type: 'scenes', project });
  }, []);

  const navigateToScene = useCallback((scene: SceneRecord, project: ProjectRecord) => {
    window.history.pushState(null, '', `/project/${encodeURIComponent(project.id)}/scene/${encodeURIComponent(scene.id)}`);
    setPage({ type: 'scene', sceneId: scene.id, project });
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

  if (authState.status === 'loading') {
    return null;
  }

  if (authState.status === 'unauthenticated') {
    return <LoginPage onAuthenticated={user => setAuthState({ status: 'authenticated', user })} />;
  }

  if (page.type === 'scene') {
    return (
      <ScenePage
        initialSceneId={page.sceneId}
        onBack={() => navigateBackToScenes(page.project)}
        onSaved={handleSaved}
        onDirtyChange={handleDirtyChange}
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

  return <ProjectListPage onSelect={navigateToProject} onLogout={handleLogout} />;
}

window.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.body);
  root.render(<App />);
});
