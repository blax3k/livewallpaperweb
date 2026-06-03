import React, { useState, useEffect } from 'react';
import './ProjectListPage.scss';
import { NewProjectDialog } from './controls/NewProjectDialog';
import { Button } from './components/Button';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';

interface ProjectRecord {
  id: string;
  name: string;
  scene_names: string[];
  scene_thumbnail_urls: string[];
}

interface ProjectListPageProps {
  onSelect: (project: ProjectRecord) => void;
}

function ProjectCollage({ sceneNames, sceneThumbnailUrls }: { sceneNames: string[]; sceneThumbnailUrls: string[] }) {
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());

  if (!sceneNames || sceneNames.length === 0) {
    return <div className="project-card-icon">📁</div>;
  }

  const cells = [...sceneNames.slice(0, 4)];
  while (cells.length < 4) cells.push('');

  return (
    <div className="project-card-collage">
      {cells.map((name, i) => {
        const thumbnailSrc = name ? (sceneThumbnailUrls[i] ?? '') : '';
        const thumbKey = thumbnailSrc || name;

        return (
          <div key={i} className="project-card-collage-cell">
            {thumbnailSrc && !failedThumbs.has(thumbKey) && (
              <img
                src={thumbnailSrc}
                alt=""
                onError={() => setFailedThumbs(prev => new Set(prev).add(thumbKey))}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProjectListPage({ onSelect }: ProjectListPageProps) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((records: ProjectRecord[]) => { setProjects(records); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = (name: string) => {
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
      .then(r => r.json())
      .then((project: ProjectRecord) => {
        setProjects(prev => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
        setShowDialog(false);
      });
  };

  return (
    <PageLayout>
      <PageHeader title="Projects">
        <Button onClick={() => setShowDialog(true)}>+ Project</Button>
      </PageHeader>
      <PageBody>
        {loading && <div className="project-list-empty">Loading…</div>}
        {!loading && projects.length === 0 && (
          <div className="project-list-empty">No projects yet. Create one to get started.</div>
        )}
        {!loading && projects.length > 0 && (
          <div className="project-list-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card" onClick={() => onSelect(project)}>
                <ProjectCollage
                  sceneNames={project.scene_names}
                  sceneThumbnailUrls={project.scene_thumbnail_urls}
                />
                <div className="project-card-name">{project.name}</div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
      {showDialog && (
        <NewProjectDialog
          onConfirm={handleCreate}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </PageLayout>
  );
}
