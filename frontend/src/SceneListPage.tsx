import React, { useState, useEffect, useRef } from 'react';
import './SceneListPage.scss';
import { Button } from './components/Button';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';
import { NewSceneDialog } from './controls/NewSceneDialog';

interface SceneRecord {
  id: string;
  name: string;
  label: string;
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
  const [showDialog, setShowDialog] = useState(false);
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
      .then(r => r.json())
      .then((scene: SceneRecord) => {
        setShowDialog(false);
        onSelect(scene);
      });
  };

  return (
    <PageLayout>
      <PageHeader title="Scenes" left={onBack && <Button onClick={onBack}>←</Button>}>
        <Button onClick={() => setShowDialog(true)}>+ Scene</Button>
      </PageHeader>
      <PageBody>
        {loading && <div className="scene-list-empty">Loading…</div>}
        {!loading && scenes.length === 0 && (
          <div className="scene-list-empty">No scenes found. Create one from within the editor.</div>
        )}
        {!loading && scenes.length > 0 && (
          <div className="scene-list-grid">
            {scenes.map(scene => (
              <div key={scene.id} className="scene-card" onClick={() => onSelect(scene)}>
                <div className="scene-card-preview">
                  <img
                    src={`/thumbnails/${scene.name}.jpg?v=${thumbBuster}`}
                    alt={scene.label}
                    className="scene-card-thumb"
                    onError={() => setFailedThumbs(prev => new Set(prev).add(scene.name))}
                  />
                  {failedThumbs.has(scene.name) && <span className="scene-card-icon">🎬</span>}
                </div>
                <div className="scene-card-label">{scene.label}</div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
      {showDialog && (
        <NewSceneDialog
          onConfirm={handleCreate}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </PageLayout>
  );
}
