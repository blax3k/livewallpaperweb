import React, { useState, useEffect } from 'react';
import './ProjectListPage.scss';
import { NewProjectDialog } from './controls/NewProjectDialog';
import { Button } from './components/Button';
import { PageLayout, PageHeader, PageBody } from './components/PageLayout';
import { projectsApi } from './api';

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
  onLogout?: () => void;
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

export function ProjectListPage({ onSelect, onLogout }: ProjectListPageProps) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    projectsApi.list()
      .then(records => { setProjects(records); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const activeProjects = projects.filter(project => project.status === 'ACTIVE');
  const archivedProjects = projects.filter(project => project.status === 'ARCHIVED');

  const handleCreate = (name: string) => {
    projectsApi.create(name)
      .then(project => {
        setProjects(prev => [...prev, project as ProjectRecord].sort((a, b) => a.name.localeCompare(b.name)));
        setShowDialog(false);
      })
      .catch(() => {});
  };

  const handleArchive = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await projectsApi.archive(projectId);
      setProjects(prev => prev.map(p => (p.id === updated.id ? updated as ProjectRecord : p)));
    } catch {
      window.alert('Failed to archive project');
    }
  };

  const handleUnarchive = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await projectsApi.unarchive(projectId);
      setProjects(prev => prev.map(p => (p.id === updated.id ? updated as ProjectRecord : p)));
    } catch {
      window.alert('Failed to unarchive project');
    }
  };

  return (
    <PageLayout>
      <PageHeader title="Projects">
        <Button onClick={() => setShowDialog(true)}>+ Project</Button>
        {onLogout && <Button onClick={onLogout}>Log out</Button>}
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
