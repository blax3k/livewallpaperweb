import React, { useState, useEffect } from 'react';
import './ProjectListPage.scss';
import { NewProjectDialog } from './controls/NewProjectDialog';
import { Button } from './components/Button';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';

type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

interface ProjectRecord {
  id: string;
  name: string;
  status: ProjectStatus;
  scene_ids: string[];
  scene_thumbnail_urls: string[];
}

interface ProjectListPageProps {
  onSelect: (project: ProjectRecord) => void;
}

function ProjectCollage({ sceneIds, sceneThumbnailUrls }: { sceneIds: string[]; sceneThumbnailUrls?: string[] }) {
  const [failedThumbs, setFailedThumbs] = useState<Set<string>>(new Set());

  if (!sceneIds || sceneIds.length === 0) {
    return <div className="project-card-icon">📁</div>;
  }

  const cells = [...sceneIds.slice(0, 4)];
  while (cells.length < 4) cells.push('');

  return (
    <div className="project-card-collage">
      {cells.map((id, i) => {
        const thumbnailSrc = id ? (sceneThumbnailUrls?.[i] ?? '') : '';

        return (
          <div key={i} className="project-card-collage-cell">
            {thumbnailSrc && !failedThumbs.has(thumbnailSrc) && (
              <img
                src={thumbnailSrc}
                alt=""
                onError={() => setFailedThumbs(prev => new Set(prev).add(thumbnailSrc))}
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
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((records: ProjectRecord[]) => { setProjects(records); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activeProjects = projects.filter(project => project.status === 'ACTIVE');
  const archivedProjects = projects.filter(project => project.status === 'ARCHIVED');

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

  const handleArchive = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const res = await fetch(`/api/projects/${projectId}/archive`, { method: 'PATCH' });
    if (!res.ok) {
      window.alert('Failed to archive project');
      return;
    }

    const archivedProject: ProjectRecord = await res.json();
    setProjects(prev => prev.map(project => (project.id === archivedProject.id ? archivedProject : project)));
  };

  const handleUnarchive = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const res = await fetch(`/api/projects/${projectId}/unarchive`, { method: 'PATCH' });
    if (!res.ok) {
      window.alert('Failed to unarchive project');
      return;
    }

    const unarchivedProject: ProjectRecord = await res.json();
    setProjects(prev => prev.map(project => (project.id === unarchivedProject.id ? unarchivedProject : project)));
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
        {!loading && activeProjects.length > 0 && (
          <div className="project-list-grid">
            {activeProjects.map(project => (
              <div key={project.id} className="project-card" onClick={() => onSelect(project)}>
                <ProjectCollage
                  sceneIds={project.scene_ids}
                  sceneThumbnailUrls={project.scene_thumbnail_urls}
                />
                <div className="project-card-name">{project.name}</div>
                <div className="project-card-actions">
                  <Button
                    className="project-card-action"
                    onClick={e => handleArchive(project.id, e)}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && archivedProjects.length > 0 && (
          <div className="project-archive-section">
            <Button
              className="project-archive-toggle"
              onClick={() => setShowArchived(prev => !prev)}
            >
              <span className={`project-archive-toggle-icon${showArchived ? ' is-open' : ''}`}>▸</span>
              Archived projects
            </Button>
            {showArchived && (
              <div className="project-list-grid project-list-grid--archived">
                {archivedProjects.map(project => (
                  <div key={project.id} className="project-card project-card--archived" onClick={() => onSelect(project)}>
                    <ProjectCollage
                      sceneIds={project.scene_ids}
                      sceneThumbnailUrls={project.scene_thumbnail_urls}
                    />
                    <div className="project-card-name">{project.name}</div>
                    <div className="project-card-actions">
                      <Button
                        className="project-card-action"
                        onClick={e => handleUnarchive(project.id, e)}
                      >
                        Unarchive
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
