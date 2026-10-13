import React from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Plus,
  Users,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function HomeView({
  projects = [],
  tasks = [],
  teamMembers = [],
  onSelectProject,
  onOpenNewProject,
  activeRole
}) {
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const todayStr = new Date().toISOString().substring(0, 10);
  const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'done');
  const urgentTasks = tasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'done');
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Header */}
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.4rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Workspace Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Overview across <strong>{totalProjects} active project{totalProjects === 1 ? '' : 's'}</strong> and <strong>{totalTasks} task{totalTasks === 1 ? '' : 's'}</strong>.
          </p>
        </div>

        {activeRole === 'manager' && (
          <button className="btn btn-primary" onClick={onOpenNewProject} style={{ padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}>
            <Plus size={16} />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="analytics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Projects</span>
            <FolderKanban size={18} color="#6366f1" />
          </div>
          <div className="metric-val">{totalProjects}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Company active initiatives
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Overall Completion</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div className="metric-val">{completionRate}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {doneTasks} of {totalTasks} tasks resolved
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>In Progress Work</span>
            <TrendingUp size={18} color="#06b6d4" />
          </div>
          <div className="metric-val">{inProgressTasks}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Actively being executed
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Company Team</span>
            <Users size={18} color="#ec4899" />
          </div>
          <div className="metric-val">{teamMembers.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Engineers & managers
          </div>
        </div>
      </div>

      {/* Projects Showcase Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Company Projects Portfolio</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Select any project to open its Kanban board and task backlog
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1.25rem'
        }}>
          {projects.map(proj => {
            const projTasks = tasks.filter(t => t.projectId === proj.id);
            const projDone = projTasks.filter(t => t.status === 'done').length;
            const pct = projTasks.length > 0 ? Math.round((projDone / projTasks.length) * 100) : 0;

            return (
              <div
                key={proj.id}
                className="task-card"
                style={{ padding: '1.4rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                onClick={() => onSelectProject(proj.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="project-key-tag">{proj.key}</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.45rem' }}>
                      {proj.title}
                    </h3>
                  </div>
                  <span className={`priority-badge priority-${proj.priority || 'medium'}`}>
                    {proj.priority || 'medium'}
                  </span>
                </div>

                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {proj.description || 'No description provided.'}
                </p>

                {/* Progress bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Progress: {projDone}/{projTasks.length} tasks</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pct}%</span>
                  </div>
                  <div className="progress-bar-track" style={{ height: '6px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #6366f1, #10b981)'
                      }}
                    />
                  </div>
                </div>

                {/* Card footer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  <span>Manager: <strong style={{ color: 'var(--text-primary)' }}>{proj.manager || 'Alex Mercer'}</strong></span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#4f46e5', fontWeight: 600 }}>
                    <span>Open Project</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority / High-Attention Tasks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} color="#f59e0b" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Priority & Urgent Tasks</h2>
        </div>

        <div className="list-view-container">
          <table className="task-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Task Title</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignee</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {urgentTasks.slice(0, 5).map(task => {
                const proj = projects.find(p => p.id === task.projectId);
                const isOverdue = task.dueDate && task.dueDate < todayStr;
                return (
                  <tr
                    key={task.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectProject(task.projectId)}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#4f46e5' }}>
                      {task.taskKey}
                    </td>
                    <td style={{ fontWeight: 600 }}>{task.title}</td>
                    <td>
                      <span className="project-key-tag">{proj?.key || 'PRJ'}</span>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge priority-${task.priority}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td>{task.assignee?.name || 'Unassigned'}</td>
                    <td style={{ color: isOverdue ? '#dc2626' : 'var(--text-secondary)', fontWeight: isOverdue ? 600 : 400 }}>
                      {task.dueDate || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
