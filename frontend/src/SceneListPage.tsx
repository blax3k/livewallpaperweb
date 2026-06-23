import React, { useState, useEffect, useCallback } from 'react';
import './SceneListPage.scss';
import { Button } from './components/Button';
import { SceneCard } from './components/SceneCard';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';
import { NewSceneDialog } from './controls/modals/NewSceneDialog';
import { SceneFlagsModal } from './controls/modals/SceneFlagsModal';
import { scenesApi, flagsApi, projectsApi } from './api';
import type { FlagDefinition, SceneFlagDeclarations } from '@livewallpaper/types';
import { formatBytes } from './utils/sceneSize';

interface SceneRecord {
  id: string;
  name: string;
  label: string;
  thumbnail_url: string;
}

interface SceneListPageProps {
  onSelect: (scene: SceneRecord) => void;
  onBack?: () => void;
  onFlags?: () => void;
  onRules?: () => void;
  projectname: string;
  projectId?: string;
  projectSize?: number;
  thumbBuster?: number;
}

export function SceneListPage({ onSelect, onBack, onFlags, onRules, projectId, projectname, projectSize, thumbBuster = 0 }: SceneListPageProps) {
  const [scenes, setScenes] = useState<SceneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
  const [fetchedName, setFetchedName] = useState<string | undefined>(undefined);
  const [fetchedSize, setFetchedSize] = useState<number | undefined>(undefined);

  // Scene flags modal state
  const [deleteScene, setDeleteScene] = useState<SceneRecord | null>(null);

  // Scene flags modal state
  const [flagsScene, setFlagsScene] = useState<SceneRecord | null>(null);
  const [flagsModalData, setFlagsModalData] = useState<{ declarations: SceneFlagDeclarations; label: string } | null>(null);
  const [availableFlags, setAvailableFlags] = useState<FlagDefinition[]>([]);
  const [flagsModalLoading, setFlagsModalLoading] = useState(false);

  useEffect(() => {
    scenesApi.list(projectId)
      .then((records) => { setScenes(records); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!projectId || (projectname && projectSize !== undefined)) return;
    projectsApi.get(projectId)
      .then(p => {
        if (!projectname) setFetchedName(p.name);
        if (projectSize === undefined) setFetchedSize(p.total_size_bytes);
      })
      .catch(() => {});
  }, [projectId]);

  const handleCreate = (label: string, copyFromSceneId?: string) => {
    const name = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    scenesApi.create(name, label.trim(), { sprites: [], xFocus: 0 }, projectId, copyFromSceneId)
      .then((scene) => {
        if (!scene?.id || !scene?.name) {
          throw new Error('Invalid scene response from server');
        }
        setShowNewSceneDialog(false);
        onSelect(scene);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to create scene';
        window.alert(message);
      });
  };

  const handleDeleteScene = useCallback(async () => {
    if (!deleteScene) return;
    try {
      await scenesApi.delete(deleteScene.id);
      setScenes(prev => prev.filter(s => s.id !== deleteScene.id));
    } catch {
      window.alert('Failed to delete scene.');
    } finally {
      setDeleteScene(null);
    }
  }, [deleteScene]);

  const openSceneFlags = useCallback(async (scene: SceneRecord) => {
    setFlagsScene(scene);
    setFlagsModalLoading(true);
    try {
      const [sceneDetail, flags] = await Promise.all([
        scenesApi.get(scene.id),
        projectId ? flagsApi.list(projectId) : Promise.resolve<FlagDefinition[]>([]),
      ]);
      setAvailableFlags(flags);
      setFlagsModalData({ declarations: sceneDetail.data.flags ?? {}, label: sceneDetail.label });
    } catch {
      window.alert('Failed to load scene flags.');
      setFlagsScene(null);
    } finally {
      setFlagsModalLoading(false);
    }
  }, [projectId]);

  const handleSaveSceneFlags = useCallback(async (declarations: SceneFlagDeclarations) => {
    if (!flagsScene || !flagsModalData) return;
    try {
      const sceneDetail = await scenesApi.get(flagsScene.id);
      await scenesApi.update(flagsScene.id, flagsModalData.label, { ...sceneDetail.data, flags: declarations });
    } catch {
      window.alert('Failed to save scene flags.');
    } finally {
      setFlagsScene(null);
      setFlagsModalData(null);
    }
  }, [flagsScene, flagsModalData]);

  return (
    <PageLayout>
      <PageHeader
        title={
          <>
            {projectname || fetchedName}
            {(projectSize ?? fetchedSize) !== undefined && (
              <span className="project-size-badge">{formatBytes((projectSize ?? fetchedSize)!)}</span>
            )}
          </>
        }
        left={onBack && <Button onClick={onBack}>←</Button>}
      >
        {onFlags && <Button onClick={onFlags}>Flags</Button>}
        {onRules && <Button onClick={onRules}>Rules</Button>}
        <Button onClick={() => setShowNewSceneDialog(true)}>+ Scene</Button>
      </PageHeader>
      <PageBody>
        {loading && <div className="scene-list-empty">Loading…</div>}
        {!loading && scenes.length === 0 && (
          <div className="scene-list-empty">No scenes found. Create one from within the editor.</div>
        )}
        {!loading && scenes.length > 0 && (
          <div className="scene-list-grid">
            {scenes.map(scene => (
              <div key={scene.id} className="scene-card-wrapper">
                <SceneCard
                  label={scene.label}
                  thumbnail_url={scene.thumbnail_url}
                  thumbBuster={thumbBuster}
                  onClick={() => onSelect(scene)}
                />
                <button
                  className="scene-flags-btn"
                  title="Edit scene flag declarations"
                  onClick={e => { e.stopPropagation(); openSceneFlags(scene); }}
                >
                  🚩
                </button>
                <button
                  className="scene-delete-btn"
                  title="Delete scene"
                  onClick={e => { e.stopPropagation(); setDeleteScene(scene); }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </PageBody>
      {showNewSceneDialog && (
        <NewSceneDialog
          onConfirm={handleCreate}
          onCancel={() => setShowNewSceneDialog(false)}
          scenes={scenes.map(s => ({ id: s.id, label: s.label, thumbnail_url: s.thumbnail_url }))}
        />
      )}
      {deleteScene && (
        <div className="modal-overlay">
          <div className="modal-box">
            <p>Delete scene <strong>{deleteScene.label}</strong>? This cannot be undone.</p>
            <div className="modal-actions">
              <Button onClick={() => setDeleteScene(null)}>Cancel</Button>
              <Button onClick={handleDeleteScene} variant="danger">Delete</Button>
            </div>
          </div>
        </div>
      )}
      {flagsScene && flagsModalLoading && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ minWidth: 200, textAlign: 'center' }}>Loading…</div>
        </div>
      )}
      {flagsScene && !flagsModalLoading && flagsModalData && (
        <SceneFlagsModal
          sceneName={flagsScene.label}
          flags={availableFlags}
          declarations={flagsModalData.declarations}
          onSave={handleSaveSceneFlags}
          onClose={() => { setFlagsScene(null); setFlagsModalData(null); }}
        />
      )}
    </PageLayout>
  );
}
