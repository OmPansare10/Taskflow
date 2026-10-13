import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import AssigneeAvatarTooltip from './AssigneeAvatarTooltip';

const STATUS_LABELS = {
  todo: { text: 'To Do', color: '#64748b' },
  in_progress: { text: 'In Progress', color: '#0284c7' },
  review: { text: 'In Review', color: '#d97706' },
  done: { text: 'Done', color: '#059669' },
};

export default function ListView({ tasks = [], onTaskClick, onMoveStage, teamMembers = [], project = null, currentUser = null }) {
  if (tasks.length === 0) {
    return (
      <div className="list-view-container" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No tasks match your current filters.
      </div>
    );
  }

  return (
    <div className="list-view-container">
      <table className="task-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Task Title</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Due Date</th>
            <th>Hours (Spent / Est)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const assignee = task.assignee || { name: 'Unassigned', avatar: 'UN', color: '#94a3b8' };
            const statusInfo = STATUS_LABELS[task.status] || { text: task.status, color: '#64748b' };
            // Check if due date is within 3 days (or overdue) and task is not done
            let isDueSoon = false;
            let isOverdue = false;
            if (task.dueDate && task.status !== 'done') {
              try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(task.dueDate.substring(0, 10) + 'T00:00:00');
                const diffTime = due.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 3) {
                  isDueSoon = true;
                }
                if (diffDays < 0) {
                  isOverdue = true;
                }
              } catch (e) {
                // fallback
              }
            }

            let badgeLabel = task.priority || 'medium';
            let badgeClass = `priority-${task.priority || 'medium'}`;
            if (task.status === 'done') {
              badgeLabel = 'Done';
              badgeClass = 'priority-done';
            } else if (isDueSoon || task.priority === 'urgent') {
              badgeLabel = 'Urgent';
              badgeClass = 'priority-urgent';
            }

            return (
              <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => onTaskClick(task)}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#4f46e5' }}>
                  {task.taskKey}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</div>
                  {task.labels && task.labels.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                      {task.labels.map((l, i) => (
                        <span key={i} className="tag-badge">{l}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: `${statusInfo.color}22`,
                    color: statusInfo.color,
                    border: `1px solid ${statusInfo.color}44`
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusInfo.color }}></span>
                    {statusInfo.text}
                  </span>
                </td>
                <td>
                  <span className={`priority-badge ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AssigneeAvatarTooltip
                      assignee={assignee}
                      teamMembers={teamMembers}
                      project={project}
                      currentUser={currentUser}
                      size={26}
                      fontSize="0.7rem"
                    />
                    <span>{assignee.name}</span>
                  </div>
                </td>
                <td>
                  {task.dueDate ? (
                    <span style={{
                      color: isOverdue ? '#dc2626' : 'var(--text-secondary)',
                      fontWeight: isOverdue ? 600 : 400
                    }}>
                      {task.dueDate}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>&mdash;</span>
                  )}
                </td>
                <td>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {task.spentHours || 0}h / {task.estimatedHours || 0}h
                  </span>
                </td>
                <td>
                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}>
                    <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
