import React from 'react';
import {
  Trophy,
  Award,
  CheckCircle2,
  TrendingUp,
  Clock,
  Sparkles,
  Users,
  Target
} from 'lucide-react';

export default function ProjectContributionLeaderboard({ project, tasks = [], teamMembers = [] }) {
  if (!project) return null;

  // Filter tasks belonging to this project
  const projectTasks = tasks.filter(t => t.projectId === project.id || !t.projectId);
  const totalTasks = projectTasks.length;
  const totalDoneTasks = projectTasks.filter(t => t.status === 'done').length;
  const overallProjectCompletion = totalTasks > 0 ? Math.round((totalDoneTasks / totalTasks) * 100) : 0;

  // Aggregate stats per contributor
  const memberMap = new Map();

  // Seed with project team members
  (project.teamMembers || []).forEach(m => {
    if (m && m.name) {
      memberMap.set(m.name.toLowerCase(), {
        name: m.name,
        role: m.role || 'Team Member',
        avatar: m.avatar || m.name.substring(0, 2).toUpperCase(),
        color: m.color || '#6366f1',
        totalAssigned: 0,
        doneCount: 0,
        inProgressCount: 0,
        hoursSpent: 0
      });
    }
  });

  // Calculate task statistics from project tasks
  projectTasks.forEach(task => {
    const assigneeName = task.assignee?.name || (typeof task.assignee === 'string' ? task.assignee : 'Unassigned');
    const key = assigneeName.toLowerCase();

    if (!memberMap.has(key)) {
      memberMap.set(key, {
        name: assigneeName,
        role: task.assignee?.role || (assigneeName === 'Unassigned' ? 'Unassigned Pool' : 'Team Member'),
        avatar: task.assignee?.avatar || assigneeName.substring(0, 2).toUpperCase(),
        color: task.assignee?.color || '#94a3b8',
        totalAssigned: 0,
        doneCount: 0,
        inProgressCount: 0,
        hoursSpent: 0
      });
    }

    const member = memberMap.get(key);
    member.totalAssigned += 1;
    if (task.status === 'done') {
      member.doneCount += 1;
    } else if (task.status === 'in_progress') {
      member.inProgressCount += 1;
    }
    member.hoursSpent += parseFloat(task.spentHours || 0);
  });

  // Convert to array and calculate percentage contribution
  const leaderboard = Array.from(memberMap.values())
    .map(m => {
      // Percentage of the entire project completed by this member
      const percentOfProject = totalTasks > 0 ? ((m.doneCount / totalTasks) * 100) : 0;
      // Member's internal task resolution rate
      const personalCompletionRate = m.totalAssigned > 0 ? Math.round((m.doneCount / m.totalAssigned) * 100) : 0;

      return {
        ...m,
        percentOfProject: parseFloat(percentOfProject.toFixed(1)),
        personalCompletionRate
      };
    })
    // Sort strictly in descending order:
    // 1st: most tasks done
    // 2nd: highest percentage of project completed
    // 3rd: total assigned tasks
    .sort((a, b) => {
      if (b.doneCount !== a.doneCount) {
        return b.doneCount - a.doneCount;
      }
      if (a.name === 'Unassigned') return 1;
      if (b.name === 'Unassigned') return -1;
      if (b.percentOfProject !== a.percentOfProject) {
        return b.percentOfProject - a.percentOfProject;
      }
      return b.totalAssigned - a.totalAssigned;
    });

  // Medal styling for top 3
  const getRankBadge = (index) => {
    if (index === 0) {
      return {
        label: '1st',
        badge: '👑 Top Contributor',
        color: '#b45309',
        bg: '#fef3c7',
        border: '#fde68a'
      };
    }
    if (index === 1) {
      return {
        label: '2nd',
        badge: '🥈 Runner Up',
        color: '#475569',
        bg: '#f1f5f9',
        border: '#cbd5e1'
      };
    }
    if (index === 2) {
      return {
        label: '3rd',
        badge: '🥉 3rd Place',
        color: '#c2410c',
        bg: '#ffedd5',
        border: '#fed7aa'
      };
    }
    return {
      label: `#${index + 1}`,
      badge: `#${index + 1}`,
      color: 'var(--text-muted)',
      bg: '#f8fafc',
      border: 'var(--border-subtle)'
    };
  };

  return (
    <div style={{
      marginTop: '2.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem'
    }}>
      {/* Header of Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(245, 158, 11, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}>
              <Trophy size={18} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Project Task Completion & Contribution Leaderboard
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Ranked in descending order by who completed more tasks and their percentage contribution to <strong>{project.title}</strong>.
          </p>
        </div>

        {/* Global Project Progress Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          padding: '0.6rem 1.15rem',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Target size={16} color="#6366f1" />
            <span>Total Tasks: <strong style={{ color: 'var(--text-primary)' }}>{totalTasks}</strong></span>
          </div>
          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>Project Completed: <strong style={{ color: '#10b981' }}>{overallProjectCompletion}%</strong></span>
          </div>
        </div>
      </div>

      {/* Leaderboard Grid / Rows */}
      {leaderboard.length === 0 ? (
        <div style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border-subtle)',
          color: 'var(--text-muted)'
        }}>
          No task activity or contributors recorded for this project yet.
        </div>
      ) : (
        <div
          className="leaderboard-scroll-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            maxHeight: '420px',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '0.5rem',
            paddingBottom: '0.35rem'
          }}
        >
          {leaderboard.map((member, index) => {
            const rank = getRankBadge(index);
            const isTop = index === 0 && member.doneCount > 0;

            return (
              <div
                key={member.name + index}
                style={{
                  background: isTop ? '#fffdf5' : 'var(--bg-card)',
                  border: isTop ? '1px solid #fde68a' : '1px solid var(--border-subtle)',
                  borderRadius: '14px',
                  padding: '1.15rem 1.4rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Left: Rank + Avatar + Name & Role */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '240px' }}>
                  {/* Rank indicator */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: rank.bg,
                    border: `1px solid ${rank.border}`,
                    color: rank.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    flexShrink: 0
                  }}>
                    {rank.label}
                  </div>

                  {/* User Avatar */}
                  <div
                    className="user-avatar"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: member.color || '#6366f1',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    {member.avatar}
                  </div>

                  {/* Name, Role & Top Contributor Tag */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {member.name}
                      </span>
                      {isTop && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '999px',
                          background: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <Sparkles size={11} />
                          <span>Top Done</span>
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {member.role}
                    </span>
                  </div>
                </div>

                {/* Center: Contribution Progress Bar */}
                <div style={{
                  flex: '1 1 260px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  maxWidth: '380px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Project Share: <strong style={{ color: 'var(--text-primary)' }}>{member.doneCount}</strong> of {totalTasks} total tasks
                    </span>
                    <span style={{ fontWeight: 800, color: member.doneCount > 0 ? '#059669' : 'var(--text-muted)' }}>
                      {member.percentOfProject}% of project
                    </span>
                  </div>

                  <div className="progress-bar-track" style={{ height: '8px', background: '#e2e8f0' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${member.percentOfProject}%`,
                        background: member.doneCount > 0
                          ? 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)'
                          : 'transparent'
                      }}
                    />
                  </div>
                </div>

                {/* Right: Key Metrics / Stats Pill */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  flexShrink: 0
                }}>
                  {/* Tasks completed stat */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: member.doneCount > 0 ? '#059669' : 'var(--text-muted)' }}>
                      {member.doneCount}
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>
                        done
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {member.totalAssigned} assigned
                    </div>
                  </div>

                  {/* Big Percentage Badge */}
                  <div style={{
                    padding: '0.55rem 0.95rem',
                    borderRadius: '10px',
                    background: member.doneCount > 0 ? '#ecfdf5' : '#f8fafc',
                    border: member.doneCount > 0 ? '1px solid #a7f3d0' : '1px solid var(--border-subtle)',
                    textAlign: 'center',
                    minWidth: '88px'
                  }}>
                    <div style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: member.doneCount > 0 ? '#059669' : 'var(--text-muted)',
                      letterSpacing: '-0.02em'
                    }}>
                      {member.percentOfProject}%
                    </div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      Project Done
                    </div>
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
