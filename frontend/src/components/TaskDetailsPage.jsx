import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckSquare,
  MessageSquare,
  Clock,
  Send,
  Trash2,
  Save,
  User,
  Tag,
  Calendar,
  Lock,
  AlertCircle,
  FolderKanban,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api';

export default function TaskDetailsPage({
  taskToEdit = null,
  projectId = null,
  project = null,
  initialStatus = 'todo',
  teamMembers = [],
  activeRole = 'manager',
  isProjectManager = true,
  currentUser = null,
  onSave,
  onDelete,
  onBack
}) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'comments' | 'activity'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: initialStatus,
    priority: 'medium',
    assigneeName: '',
    dueDate: '',
    estimatedHours: '',
    spentHours: '',
    labels: ''
  });
  const [comments, setComments] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Consolidated assignees list from personal team, project team members, current user, and task assignee
  const availableAssignees = React.useMemo(() => {
    const list = [];
    const seen = new Set();

    const addMember = (m) => {
      if (!m) return;
      const name = m.name || (m.firstName ? `${m.firstName} ${m.lastName}`.trim() : '');
      const email = (m.email || '').toLowerCase().trim();
      const key = email || name;
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push({
        id: m.id || m._id || m.userId || key,
        name: name,
        email: email,
        role: m.role || 'Team Member',
        avatar: m.avatar || (name ? name.substring(0, 2).toUpperCase() : 'TM'),
        color: m.color || '#6366f1'
      });
    };

    if (Array.isArray(teamMembers)) {
      teamMembers.forEach(addMember);
    }
    if (project && Array.isArray(project.teamMembers)) {
      project.teamMembers.forEach(addMember);
    }
    if (currentUser) {
      addMember(currentUser);
    }
    if (taskToEdit && taskToEdit.assignee) {
      addMember(taskToEdit.assignee);
    }

    return list;
  }, [teamMembers, project, currentUser, taskToEdit]);

  useEffect(() => {
    if (taskToEdit) {
      setFormData({
        title: taskToEdit.title || '',
        description: taskToEdit.description || '',
        status: taskToEdit.status || 'todo',
        priority: taskToEdit.priority || 'medium',
        assigneeName: taskToEdit.assignee?.name || '',
        dueDate: taskToEdit.dueDate || '',
        estimatedHours: taskToEdit.estimatedHours ? String(taskToEdit.estimatedHours) : '',
        spentHours: taskToEdit.spentHours ? String(taskToEdit.spentHours) : '',
        labels: Array.isArray(taskToEdit.labels) ? taskToEdit.labels.join(', ') : ''
      });
      setComments(taskToEdit.comments || []);
      setActivityLog(taskToEdit.activityLog || []);
    } else {
      setFormData({
        title: '',
        description: '',
        status: initialStatus,
        priority: 'medium',
        assigneeName: availableAssignees[0]?.name || '',
        dueDate: '',
        estimatedHours: '8',
        spentHours: '0',
        labels: 'Feature'
      });
      setComments([]);
      setActivityLog([]);
    }
    setActiveTab('details');
    setError('');
  }, [taskToEdit, initialStatus, availableAssignees]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() && isProjectManager) {
      setError('Task title is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const selectedMember = availableAssignees.find(m => m.name === formData.assigneeName) || taskToEdit?.assignee || {
        name: formData.assigneeName || 'Unassigned',
        role: 'Team Member',
        avatar: (formData.assigneeName || 'UN').substring(0, 2).toUpperCase(),
        color: '#6366f1'
      };

      const currentUserName = currentUser
        ? (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.name)
        : (isProjectManager ? 'Project Manager' : 'Team Member');

      let payload;
      if (isProjectManager) {
        payload = {
          projectId: projectId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          status: formData.status,
          priority: formData.priority,
          assignee: selectedMember,
          dueDate: formData.dueDate,
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : 0,
          spentHours: formData.spentHours ? parseFloat(formData.spentHours) : 0,
          labels: formData.labels ? formData.labels.split(',').map(l => l.trim()).filter(Boolean) : [],
          updatedBy: currentUserName
        };
      } else {
        // Team member updating stage
        payload = {
          status: formData.status,
          updatedBy: currentUserName
        };
      }

      await onSave(payload, taskToEdit?.id);
      if (onBack) {
        onBack();
      }
    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !taskToEdit?.id) return;

    setSubmittingComment(true);
    try {
      const currentUserName = currentUser
        ? (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.name)
        : (activeRole === 'manager' ? 'Project Manager' : 'Team Member');

      const commentPayload = {
        text: newCommentText.trim(),
        author: currentUserName
      };
      const updatedTask = await api.addTaskComment(taskToEdit.id, commentPayload);
      setComments(updatedTask.comments || []);
      setActivityLog(updatedTask.activityLog || []);
      setNewCommentText('');
    } catch (err) {
      alert('Failed to post comment: ' + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = () => {
    if (!taskToEdit) return;
    if (window.confirm(`Are you sure you want to delete task "${taskToEdit.title}"?`)) {
      onDelete(taskToEdit.id);
    }
  };

  const parsedLabels = formData.labels
    ? formData.labels.split(',').map(l => l.trim()).filter(Boolean)
    : [];

  return (
    <div className="full-page-view task-details-page" id="task-details-page">
      {/* Breadcrumb Header Bar */}
      <div className="page-breadcrumb-bar">
        <div className="breadcrumb-trail">
          <span className="breadcrumb-dim">Projects</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-dim">{project?.title || 'Project'}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">
            {taskToEdit ? `Task ${taskToEdit.taskKey || ''}` : 'Create New Task'}
          </span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onBack}
          id="task-details-back-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Board</span>
        </button>
      </div>

      <div className="page-main-container">
        {/* Page Title & Status Header Card */}
        <div className="page-header-card">
          <div className="page-header-icon-box">
            <CheckSquare size={26} color="var(--accent-primary)" />
          </div>
          <div className="page-header-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>
                {taskToEdit ? (formData.title || 'Task Details') : 'Create New Task'}
              </h1>
              {taskToEdit?.taskKey && (
                <span className="project-key-tag" style={{ fontSize: '0.85rem', padding: '0.2rem 0.6rem' }}>
                  {taskToEdit.taskKey}
                </span>
              )}
              {(() => {
                let isDueSoon = false;
                if (formData.dueDate && formData.status !== 'done') {
                  try {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const due = new Date(formData.dueDate.substring(0, 10) + 'T00:00:00');
                    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
                    if (diffDays <= 3) isDueSoon = true;
                  } catch (e) {}
                }
                if (formData.status === 'done') {
                  return (
                    <span className="priority-badge priority-done" style={{ fontSize: '0.8rem' }}>
                      Done
                    </span>
                  );
                }
                if (isDueSoon || formData.priority === 'urgent') {
                  return (
                    <span className="priority-badge priority-urgent" style={{ fontSize: '0.8rem' }}>
                      Urgent
                    </span>
                  );
                }
                return (
                  <span className={`priority-badge priority-${formData.priority || 'medium'}`} style={{ fontSize: '0.8rem' }}>
                    {formData.priority || 'medium'}
                  </span>
                );
              })()}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
              Part of project: <strong>{project?.title || 'Active Project'}</strong>. Track specifications, work progress, and team collaboration.
            </p>
          </div>
        </div>

        {error && (
          <div className="profile-alert alert-error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {!isProjectManager && taskToEdit && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.85rem 1.15rem',
            fontSize: '0.875rem',
            color: '#475569',
            marginBottom: '1.25rem'
          }}>
            <Lock size={18} color="#64748b" style={{ flexShrink: 0 }} />
            <span>
              <strong>View Only Mode:</strong> Only the project manager can modify task specifications. You can leave notes and feedback under the <em>Team Comments</em> section below.
            </span>
          </div>
        )}

        {/* Tab Switcher for Existing Tasks */}
        {taskToEdit && (
          <div className="profile-page-tabs" style={{ marginBottom: '1.5rem' }}>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
              id="task-tab-details"
            >
              <CheckSquare size={16} />
              <span>Task Details & Scope</span>
            </button>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
              id="task-tab-comments"
            >
              <MessageSquare size={16} />
              <span>Team Comments ({comments.length})</span>
            </button>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
              id="task-tab-activity"
            >
              <Clock size={16} />
              <span>Audit History ({activityLog.length})</span>
            </button>
          </div>
        )}

        {/* TAB 1: DETAILS (Full 2-Column Enterprise Task View) */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit}>
            <div className="page-two-col-grid">
              {/* Left Column: Scope, Title & Specification */}
              <div className="page-card">
                <h3 className="section-title">Specifications & Acceptance Criteria</h3>

                <div className="form-group">
                  <label className="form-label" htmlFor="task-title-input">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    id="task-title-input"
                    name="title"
                    className="form-input"
                    placeholder="e.g. Implement OAuth SSO Flow"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    disabled={!isProjectManager}
                    style={{ fontSize: '1rem', fontWeight: 600 }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="task-desc-input">
                    Technical Specifications & Acceptance Criteria
                  </label>
                  <textarea
                    id="task-desc-input"
                    name="description"
                    className="form-textarea"
                    rows={7}
                    placeholder="Provide step-by-step requirements, API contracts, expected behaviors, and testing criteria..."
                    value={formData.description}
                    onChange={handleChange}
                    disabled={!isProjectManager}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="task-labels-input">
                    Labels & Component Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    id="task-labels-input"
                    name="labels"
                    className="form-input"
                    placeholder="Backend, Security, High-Impact"
                    value={formData.labels}
                    onChange={handleChange}
                    disabled={!isProjectManager}
                  />
                  {parsedLabels.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.65rem' }}>
                      {parsedLabels.map((lbl, idx) => (
                        <span key={idx} className="project-role-tag" style={{ background: '#f1f5f9', color: '#334155', fontWeight: 600 }}>
                          #{lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Workflow, Assignee, Schedule & Hours */}
              <div className="page-card">
                <h3 className="section-title">Workflow & Assignment</h3>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label">Workflow Stage</label>
                    <select
                      name="status"
                      className="form-select"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Under Review</option>
                      <option value="done">Completed / Done</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      name="priority"
                      className="form-select"
                      value={formData.priority}
                      onChange={handleChange}
                      disabled={!isProjectManager}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  {isProjectManager ? (
                    <select
                      name="assigneeName"
                      className="form-select"
                      value={formData.assigneeName}
                      onChange={handleChange}
                    >
                      <option value="">Unassigned</option>
                      {availableAssignees.map(m => {
                        const isYou = currentUser && ((m.email && m.email === currentUser.email) || m.name === (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.name));
                        return (
                          <option key={m.id || m.email || m.name} value={m.name}>
                            {m.name} {isYou ? '(You)' : ''} ({m.role || 'Team Member'})
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: taskToEdit?.assignee?.color || '#6366f1',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        {taskToEdit?.assignee?.avatar || (formData.assigneeName ? formData.assigneeName.substring(0, 2).toUpperCase() : 'UN')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {formData.assigneeName || 'Unassigned'} {currentUser && ((taskToEdit?.assignee?.email && taskToEdit.assignee.email === currentUser.email) || formData.assigneeName === (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.name)) ? '(You)' : ''}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {taskToEdit?.assignee?.role || 'Team Member'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="form-input"
                    value={formData.dueDate}
                    onChange={handleChange}
                    disabled={!isProjectManager}
                  />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="page-action-bar">
              {taskToEdit && isProjectManager ? (
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={handleDelete}
                  id="delete-task-page-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <Trash2 size={16} />
                  <span>Delete Task</span>
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onBack}
                  id="cancel-task-page-btn"
                >
                  {isProjectManager ? 'Discard & Back' : 'Back to Board'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  id="save-task-page-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.5rem', fontWeight: 700 }}
                >
                  <Save size={16} />
                  <span>
                    {saving
                      ? 'Saving...'
                      : isProjectManager
                      ? (taskToEdit ? 'Save Changes' : 'Create Task')
                      : 'Update Stage'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: COMMENTS */}
        {activeTab === 'comments' && taskToEdit && (
          <div className="page-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} color="var(--accent-primary)" />
              <span>Team Discussions & Notes ({comments.length})</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '450px', overflowY: 'auto', padding: '0.5rem 0' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No discussion comments posted yet. Add a status update, question, or note below!
                </div>
              ) : (
                comments.map((c, idx) => (
                  <div key={c.id || idx} className="comment-bubble">
                    <div className="comment-author-row">
                      <strong style={{ color: '#4f46e5', fontWeight: 700 }}>{c.author}</strong>
                      <span>{c.timestamp ? new Date(c.timestamp).toLocaleString() : 'Just now'}</span>
                    </div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                      {c.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Write a message, progress note, or blocker for the team..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingComment || !newCommentText.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.25rem' }}
              >
                <Send size={15} />
                <span>Post</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: ACTIVITY LOG */}
        {activeTab === 'activity' && taskToEdit && (
          <div className="page-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--accent-primary)" />
              <span>Audit Trail History ({activityLog.length})</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto' }}>
              {activityLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No activity history logged yet.
                </div>
              ) : (
                activityLog.map((a, idx) => (
                  <div key={a.id || idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '0.85rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem'
                  }}>
                    <Clock size={18} color="#4f46e5" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{a.user || 'System'}</span>
                        <span>{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
                      </div>
                      <div style={{ marginTop: '0.25rem', color: '#334155' }}>{a.details}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
