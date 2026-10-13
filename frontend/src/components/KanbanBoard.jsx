import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: '#64748b' },
  { id: 'in_progress', title: 'In Progress', color: '#0284c7' },
  { id: 'review', title: 'In Review', color: '#d97706' },
  { id: 'done', title: 'Done', color: '#059669' },
];

export default function KanbanBoard({
  tasks = [],
  onTaskClick,
  onMoveStage,
  onOpenNewTask,
  activeRole,
  isProjectManager = true,
  canMoveTasks = true,
  teamMembers = [],
  project = null,
  currentUser = null
}) {
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragOver = (e, colId) => {
    if (!isProjectManager && !canMoveTasks) return;
    e.preventDefault();
    if (dragOverCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = (e, colId) => {
    if (!isProjectManager && !canMoveTasks) return;
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onMoveStage(taskId, colId);
    }
  };

  return (
    <div className="kanban-board">
      {COLUMNS.map(col => {
        const columnTasks = tasks.filter(t => t.status === col.id);
        const isHovered = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-column ${isHovered ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Header */}
            <div className="column-header">
              <div className="column-title-wrap">
                <span className="column-color-indicator" style={{ backgroundColor: col.color }}></span>
                <span className="column-title">{col.title}</span>
                <span className="column-counter">{columnTasks.length}</span>
              </div>

              {isProjectManager && (
                <button
                  className="btn-icon"
                  title={`Add task to ${col.title}`}
                  onClick={() => onOpenNewTask(col.id)}
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Cards List */}
            <div className="column-cards-list">
              {columnTasks.length === 0 ? (
                <div style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.825rem',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  {isProjectManager ? 'Drop tasks here or click +' : 'No tasks in this column'}
                </div>
              ) : (
                columnTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    onMoveStage={onMoveStage}
                    isProjectManager={isProjectManager}
                    canMoveTasks={canMoveTasks}
                    teamMembers={teamMembers}
                    project={project}
                    currentUser={currentUser}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
