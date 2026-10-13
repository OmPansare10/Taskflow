import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, MessageSquare, Clock } from 'lucide-react';
import AssigneeAvatarTooltip from './AssigneeAvatarTooltip';

const STATUS_FLOW = ['todo', 'in_progress', 'review', 'done'];

export default function TaskCard({
  task,
  onClick,
  onMoveStage,
  isProjectManager = true,
  canMoveTasks = true,
  teamMembers = [],
  project = null,
  currentUser = null
}) {
  const handleDragStart = (e) => {
    if (!isProjectManager && !canMoveTasks) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const currentIdx = STATUS_FLOW.indexOf(task.status);
  const prevStatus = currentIdx > 0 ? STATUS_FLOW[currentIdx - 1] : null;
  const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

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

  const assignee = task.assignee || { name: 'Unassigned', avatar: 'UN', color: '#94a3b8' };

  // Calculate badge to display
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
    <div
      className="task-card"
      draggable={isProjectManager || canMoveTasks ? "true" : "false"}
      onDragStart={handleDragStart}
      onClick={onClick}
    >
      <div className="task-card-header">
        <span className="task-key">{task.taskKey}</span>
        <span className={`priority-badge ${badgeClass}`}>
          {badgeLabel}
        </span>
      </div>

      <h4 className="task-title">{task.title}</h4>

      {task.description && (
        <p className="task-desc-preview">{task.description}</p>
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="task-tags">
          {task.labels.map((l, i) => (
            <span key={i} className="tag-badge">{l}</span>
          ))}
        </div>
      )}

      <div className="task-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Assignee Avatar with hover popup */}
          <AssigneeAvatarTooltip
            assignee={assignee}
            teamMembers={teamMembers}
            project={project}
            currentUser={currentUser}
            size={26}
            fontSize="0.7rem"
          />

          {/* Due date */}
          {task.dueDate && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: isOverdue ? '#dc2626' : 'var(--text-muted)',
              fontSize: '0.725rem',
              fontWeight: isOverdue ? 600 : 400
            }}>
              <Calendar size={12} />
              <span>{task.dueDate.substring(5)}</span>
            </div>
          )}

          {/* Comment count */}
          {task.comments && task.comments.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.725rem' }}>
              <MessageSquare size={12} />
              <span>{task.comments.length}</span>
            </div>
          )}
        </div>

        {/* Quick Stage Mover Buttons */}
        {(isProjectManager || canMoveTasks) && (prevStatus || nextStatus) && (
          <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
            {prevStatus && (
              <button
                className="move-btn"
                title={`Move to ${prevStatus.replace('_', ' ')}`}
                onClick={() => onMoveStage(task.id, prevStatus)}
              >
                <ChevronLeft size={13} />
              </button>
            )}
            {nextStatus && (
              <button
                className="move-btn"
                title={`Move to ${nextStatus.replace('_', ' ')}`}
                onClick={() => onMoveStage(task.id, nextStatus)}
              >
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
