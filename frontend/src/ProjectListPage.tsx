import React, { useState, useEffect } from 'react';
import './ProjectListPage.scss';
import { NewProjectDialog } from './controls/NewProjectDialog';
import { Button } from './components/Button';

interface ProjectRecord {
  id: string;
  name: string;
}

interface ProjectListPageProps {
  onSelect: (project: ProjectRecord) => void;
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
    <div className="project-list-page">
      <div className="project-list-header">
        <span className="project-list-title">Projects</span>
        <Button onClick={() => setShowDialog(true)}>+ Project</Button>
      </div>
      <div className="project-list-body">
        {loading && <div className="project-list-empty">Loading…</div>}
        {!loading && projects.length === 0 && (
          <div className="project-list-empty">No projects yet. Create one to get started.</div>
        )}
        {!loading && projects.length > 0 && (
          <div className="project-list-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card" onClick={() => onSelect(project)}>
                <div className="project-card-icon">📁</div>
                <div className="project-card-name">{project.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showDialog && (
        <NewProjectDialog
          onConfirm={handleCreate}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
