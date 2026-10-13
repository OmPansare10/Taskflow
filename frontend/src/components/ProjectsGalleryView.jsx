import React, { useState } from 'react';
import {
  Users,
  ClipboardList,
  Plus,
  Briefcase,
  UserCheck,
  Layers,
  ArrowRight,
  LogOut,
  FolderPlus,
  Trash2,
  Edit3
} from 'lucide-react';

export default function ProjectsGalleryView({
  projects = [],
  tasks = [],
  currentUser,
  activeRole,
  onSelectProject,
  onOpenNewProject,
  onEditProject,
  onDeleteProject,
  onLeaveProject
}) {
  const normEmail = (email) => {
    if (!email || typeof email !== 'string') return '';
    let e = email.trim().toLowerCase();
    if (!e.includes('@') && e.includes('.')) {
      const parts = e.split('.');
      if (parts.length >= 2) {
        e = parts[0] + '@' + parts.slice(1).join('.');
      }
    }
    return e;
  };

  // Check if current user is the manager / creator of the project (Strictly by Email / ID)
  const isProjectManager = (proj) => {
    if (!currentUser || !proj) return false;
    const userEmail = normEmail(currentUser.email);
    const userId = String(currentUser.id || currentUser._id || '').trim();

    const pMgrEmail = normEmail(proj.managerEmail);
    const pCreator = String(proj.createdBy || '').trim();

    // 1. Match by manager email
    if (userEmail && pMgrEmail && userEmail === pMgrEmail) return true;

    // 2. Match by creator ID
    if (userId && pCreator && userId === pCreator) return true;

    // 3. Fallback for seed demo projects (Alex Mercer)
    if (userEmail === 'alex.mercer@company.com' && (!pMgrEmail || pMgrEmail === 'alex.mercer@company.com')) {
      if ((proj.manager || '').toLowerCase().includes('alex') || !pCreator || pCreator === 'u1' || pCreator === '65f00990a0b1c2d3e4f50001') {
        return true;
      }
    }

    return false;
  };

  // Check if current user is part of the project team members (Strictly by Email / ID)
  const isTeamMember = (proj) => {
    if (!currentUser || !proj) return false;
    // If the user created / manages the project, it belongs ONLY in Project Manager section
    if (isProjectManager(proj)) return false;

    const userEmail = normEmail(currentUser.email);
    const userId = String(currentUser.id || currentUser._id || '').trim();

    const members = Array.isArray(proj.teamMembers) ? proj.teamMembers : [];
    return members.some(m => {
      if (!m) return false;
      const mEmail = normEmail(m.email);
      const mId = String(m.id || m._id || m.userId || '').trim();

      if (userEmail && mEmail && userEmail === mEmail) return true;
      if (userId && mId && userId === mId) return true;
      return false;
    });
  };

  // Filter projects according to the selected tab
  const managerProjects = projects.filter(isProjectManager);
  const memberProjects = projects.filter(isTeamMember);

  // Filter tabs: 'manager' | 'member' | 'all'
  const [filterTab, setFilterTab] = useState(() => {
    if (currentUser?.role && !currentUser.role.includes('Manager')) {
      return 'member';
    }
    return 'manager';
  });

  let displayedProjects = projects;
  if (filterTab === 'manager') {
    displayedProjects = managerProjects;
  } else if (filterTab === 'member') {
    displayedProjects = memberProjects;
  }

  // Generate warm pastel background for project letter badge (similar to reference design)
  const getBadgeColor = (title = '') => {
    const charCode = (title.charCodeAt(0) || 65) % 5;
    const palettes = [
      { bg: '#fef3c7', text: '#92400e' }, // Warm beige/amber
      { bg: '#e0e7ff', text: '#3730a3' }, // Indigo
      { bg: '#dcfce7', text: '#166534' }, // Emerald
      { bg: '#fce7f3', text: '#9d174d' }, // Rose/pink
      { bg: '#e0f2fe', text: '#0369a1' }, // Sky cyan
    ];
    return palettes[charCode];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Upper Header Section (as requested: "upper part is same as now") */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{
            fontSize: '0.875rem',
            color: 'var(--text-muted)',
            fontWeight: 500,
            letterSpacing: '0.02em'
          }}>
            Workspace
          </span>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            margin: 0
          }}>
            Projects
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Create and manage your team projects.
          </p>
        </div>

        {/* Action Button */}
        <button
          className="btn btn-primary"
          onClick={onOpenNewProject}
          style={{ padding: '0.75rem 1.4rem' }}
        >
          <Plus size={18} />
          <span>New Project</span>
        </button>
      </div>

      {/* Role Filter Tabs: Project Manager vs Team Member */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.75rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'var(--bg-secondary)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {/* Project Manager Tab */}
          <button
            type="button"
            onClick={() => setFilterTab('manager')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.6rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              background: filterTab === 'manager' ? '#6366f1' : 'transparent',
              color: filterTab === 'manager' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <Briefcase size={16} />
            <span>Project Manager</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: filterTab === 'manager' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-tertiary)',
              color: filterTab === 'manager' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {managerProjects.length}
            </span>
          </button>

          {/* Team Member Tab */}
          <button
            type="button"
            onClick={() => setFilterTab('member')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.6rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              background: filterTab === 'member' ? '#6366f1' : 'transparent',
              color: filterTab === 'member' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <UserCheck size={16} />
            <span>Team Member</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: filterTab === 'member' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-tertiary)',
              color: filterTab === 'member' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {memberProjects.length}
            </span>
          </button>

          {/* All Projects Tab */}
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.6rem 1.15rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              background: filterTab === 'all' ? '#6366f1' : 'transparent',
              color: filterTab === 'all' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            <Layers size={16} />
            <span>All Projects</span>
            <span style={{
              fontSize: '0.75rem',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: filterTab === 'all' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-tertiary)',
              color: filterTab === 'all' ? '#ffffff' : 'var(--text-muted)'
            }}>
              {projects.length}
            </span>
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing <strong>{displayedProjects.length}</strong> {filterTab === 'manager' ? 'managed' : filterTab === 'member' ? 'team' : 'total'} project{displayedProjects.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Projects Cards Grid */}
      {displayedProjects.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-subtle)',
          textAlign: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8'
          }}>
            {filterTab === 'manager' ? <Briefcase size={28} /> : <UserCheck size={28} />}
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              {filterTab === 'manager'
                ? "No Projects Managed Yet"
                : filterTab === 'member'
                ? "Not Added to Any Team Projects Yet"
                : "No Projects Found"}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '440px', marginTop: '0.4rem' }}>
              {filterTab === 'manager'
                ? "You haven't created any projects as Project Manager. Create a project to start planning sprints and tasks."
                : "You are not listed as a team member in any projects yet. Ask a project manager to add you or browse all company projects."}
            </p>
          </div>
          {filterTab === 'manager' && (
            <button className="btn btn-primary" onClick={onOpenNewProject}>
              <Plus size={16} />
              <span>Create Your First Project</span>
            </button>
          )}
          {filterTab === 'member' && projects.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setFilterTab('all')}>
              <Layers size={16} />
              <span>View All Projects</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem'
        }}>
          {displayedProjects.map(proj => {
            const projTasks = tasks.filter(t => t.projectId === proj.id);
            const memberCount = (proj.teamMembers && proj.teamMembers.length) || 1;
            const taskCount = projTasks.length;
            const badgeStyle = getBadgeColor(proj.title);
            const userIsMgr = isProjectManager(proj);
            const userIsMember = isTeamMember(proj);
            const initialLetter = (proj.title || 'P').trim()[0].toUpperCase();

            return (
              <div
                key={proj.id}
                style={{
                  background: 'var(--card-bg, #ffffff)',
                  border: '1px solid var(--card-border, #e2e8f0)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative'
                }}
                className="project-gallery-card"
              >
                {/* Top Row: Avatar & Key / Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {/* Square rounded badge with first letter */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: badgeStyle.bg,
                    color: badgeStyle.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    {initialLetter}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="project-key-tag" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}>
                      {proj.key}
                    </span>
                    {userIsMgr && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#6366f1',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px'
                      }}>
                        Manager
                      </span>
                    )}
                  </div>
                </div>

                {/* Project Title and Description */}
                <div
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
                  onClick={() => onSelectProject(proj.id)}
                >
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--text-primary)',
                    wordBreak: 'break-word'
                  }}>
                    {proj.title}
                  </h3>
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: '1.4'
                  }}>
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                {/* Card Bottom Row: Members & Tasks + Action Button */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-subtle)'
                }}>
                  {/* Left: 👥 Members and 📋 Tasks */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={16} color="#6366f1" />
                      <span>{memberCount} Members</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <ClipboardList size={16} color="#8b5cf6" />
                      <span>{taskCount} Tasks</span>
                    </div>
                  </div>

                  {/* Right: Leave Button (for members) OR Open / Manage Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {/* Leave Button: visible when user is in the project and is not the sole manager */}
                    {userIsMember && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeaveProject(proj.id || proj._id);
                        }}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '9999px',
                          padding: '0.4rem 1rem',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                        title="Leave this project"
                      >
                        <LogOut size={13} />
                        <span>Leave</span>
                      </button>
                    )}

                    {/* Open / Manage Project Button */}
                    <button
                      type="button"
                      onClick={() => onSelectProject(proj.id)}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.825rem',
                        borderRadius: '9999px'
                      }}
                    >
                      <span>Open</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
