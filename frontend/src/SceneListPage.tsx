import React, { useState, useEffect, useRef } from 'react';
import './SceneListPage.scss';
import { Button } from './components/Button';
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
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
  const prevBusterRef = useRef(thumbBuster);

  useEffect(() => {
    if (thumbBuster !== prevBusterRef.current) {
      prevBusterRef.current = thumbBuster;
      setFailedThumbs(new Set());
    }
  }, [thumbBuster]);

  useEffect(() => {
    fetch(`/api/scenes${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`)
      .then(r => r.json())
      .then((records: SceneRecord[]) => { setScenes(records); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = (label: string) => {
    const name = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    fetch('/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, label: label.trim(), data: { sprites: [], xFocus: 0 }, projectId }),
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
            {scenes.map(scene => {
              const busterJoin = scene.thumbnail_url.includes('?') ? '&' : '?';
              const thumbnailSrc = `${scene.thumbnail_url}${busterJoin}v=${thumbBuster}`;

              return (
                <div key={scene.id} className="scene-card" onClick={() => onSelect(scene)}>
                  <div className="scene-card-preview">
                    <img
                      src={thumbnailSrc}
                      alt={scene.label}
                      className="scene-card-thumb"
                      onError={() => setFailedThumbs(prev => new Set(prev).add(scene.name))}
                    />
                    {failedThumbs.has(scene.name) && <span className="scene-card-icon">🎬</span>}
                  </div>
                  <div className="scene-card-label">{scene.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>
      {showNewSceneDialog && (
        <NewSceneDialog
          onConfirm={handleCreate}
          onCancel={() => setShowNewSceneDialog(false)}
        />
      )}
    </PageLayout>
  );
}
