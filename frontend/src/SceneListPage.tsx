import React, { useState, useEffect } from 'react';
import './SceneListPage.scss';
import { Button } from './components/Button';
import { SceneCard } from './components/SceneCard';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';
import { NewSceneDialog } from './controls/NewSceneDialog';

interface SceneRecord {
  id: string;
  name: string;
  label: string;
  thumbnail_url: string;
}

interface ApiError {
  error?: string;
  message?: string;
}

interface SceneListPageProps {
  onSelect: (scene: SceneRecord) => void;
  onBack?: () => void;
  projectId?: string;
  thumbBuster?: number;
}

export function SceneListPage({ onSelect, onBack, projectId, thumbBuster = 0 }: SceneListPageProps) {
  const [scenes, setScenes] = useState<SceneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);

  useEffect(() => {
    fetch(`/api/scenes${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`)
      .then(r => r.json())
      .then((records: SceneRecord[]) => { setScenes(records); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = (label: string, copyFromSceneId?: string) => {
    const name = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    fetch('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, label: label.trim(), data: { sprites: [], xFocus: 0 }, projectId, copyFromSceneId }),
    })
      .then(async (r) => {
        const payload = await r.json().catch(() => ({} as ApiError));
        if (!r.ok) {
          const err = payload as ApiError;
          throw new Error(err.error ?? err.message ?? 'Failed to create scene');
        }
        return payload as SceneRecord;
      })
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

  return (
    <PageLayout>
      <PageHeader title="Scenes" left={onBack && <Button onClick={onBack}>←</Button>}>
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
              <SceneCard
                key={scene.id}
                label={scene.label}
                thumbnail_url={scene.thumbnail_url}
                thumbBuster={thumbBuster}
                onClick={() => onSelect(scene)}
              />
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
    </PageLayout>
  );
}
