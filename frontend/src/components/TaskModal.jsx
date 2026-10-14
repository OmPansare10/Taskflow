import React, { useState, useEffect } from 'react';
import { X, CheckSquare, MessageSquare, Clock, Send, Trash2, Save, User, Tag, Calendar, Lock } from 'lucide-react';
import { api } from '../api';

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  taskToEdit,
  projectId,
  initialStatus = 'todo',
  teamMembers = [],
  activeRole = 'manager',
  isProjectManager = true,
  currentUser = null
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
  const [eligibleAssignees, setEligibleAssignees] = useState([]);
  const [assigneeSource, setAssigneeSource] = useState('project');
  const [projectMemberCount, setProjectMemberCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && projectId) {
      api.getProjectEligibleAssignees(projectId, {
        userEmail: currentUser?.email,
        userId: currentUser?.id || currentUser?._id
      }).then(res => {
        if (!isMounted) return;
        const list = res?.eligibleAssignees || [];
        const pCount = res?.projectMemberCount || 0;
        setProjectMemberCount(pCount);
        setEligibleAssignees(list);
        setAssigneeSource(res?.source || 'project');
        if (!taskToEdit) {
          if (pCount > 0 && res?.recommendedAssignee?.name) {
            setFormData(prev => ({
              ...prev,
              assigneeName: res.recommendedAssignee.name
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              assigneeName: ''
            }));
          }
        }
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [isOpen, projectId, currentUser?.email, currentUser?.id, taskToEdit]);

  const activeAssignees = eligibleAssignees;

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
        assigneeName: projectMemberCount > 0 ? (activeAssignees[0]?.name || '') : '',
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
  }, [taskToEdit, initialStatus, isOpen, activeAssignees, projectMemberCount]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!formData.title.trim()) {
      setError('Task title is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const isUnassigned = !formData.assigneeName || formData.assigneeName === 'Unassigned';
      const selectedMember = isUnassigned
        ? null
        : (activeAssignees.find(m => m.name === formData.assigneeName) || null);

      const payload = {
        projectId: projectId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        assignee: selectedMember,
        assigneeName: selectedMember ? selectedMember.name : 'Unassigned',
        assigned_to: selectedMember ? (selectedMember.id || selectedMember._id) : null,
        dueDate: formData.dueDate,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : 0,
        spentHours: formData.spentHours ? parseFloat(formData.spentHours) : 0,
        labels: formData.labels ? formData.labels.split(',').map(l => l.trim()).filter(Boolean) : [],
        updatedBy: activeRole === 'manager' ? 'Project Manager' : (selectedMember?.name || 'Team Member')
      };

      await onSave(payload, taskToEdit?.id);
      onClose();
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
      const commentPayload = {
        text: newCommentText.trim(),
        author: activeRole === 'manager' ? 'Project Manager' : (formData.assigneeName || 'Team Member')
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CheckSquare size={20} color="var(--accent-primary)" />
            <div>
              <h3>{taskToEdit ? `Task ${taskToEdit.taskKey || ''}` : 'Add New Task'}</h3>
              {taskToEdit && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ID: {taskToEdit.id}
                </span>
              )}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs if editing */}
        {taskToEdit && (
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Task Details
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              <MessageSquare size={14} />
              Comments ({comments.length})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <Clock size={14} />
              Activity Log ({activityLog.length})
            </button>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '0.75rem',
            color: '#f87171',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {!isProjectManager && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                color: '#475569'
              }}>
                <Lock size={16} color="#64748b" style={{ flexShrink: 0 }} />
                <span>
                  <strong>View Only:</strong> Only the project manager can change task data. You can post notes and updates in the <em>Comments</em> tab.
                </span>
              </div>
            )}

            <div className="form-group">
              <label>Task Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="e.g. Implement OAuth SSO Flow"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={!isProjectManager}
              />
            </div>

            <div className="form-group">
              <label>Description & Technical Specifications</label>
              <textarea
                name="description"
                className="form-textarea"
                rows={3}
                placeholder="Provide steps, expected behavior, acceptance criteria..."
                value={formData.description}
                onChange={handleChange}
                disabled={!isProjectManager}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select name="status" className="form-select" value={formData.status} onChange={handleChange} disabled={!isProjectManager}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Under Review</option>
                  <option value="done">Completed / Done</option>
                </select>
              </div>

              <div className="form-group">
                <label>Priority</label>
                <select name="priority" className="form-select" value={formData.priority} onChange={handleChange} disabled={!isProjectManager}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Assignee</label>
                <select name="assigneeName" className="form-select" value={formData.assigneeName} onChange={handleChange} disabled={!isProjectManager}>
                  <option value="">Unassigned</option>
                  {activeAssignees.length > 0 && (
                    <optgroup label="Project Members">
                      {activeAssignees.map(m => (
                        <option key={m.id || m.name} value={m.name}>
                          {m.name} ({m.role || 'Team Member'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {activeAssignees.length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                    No members have been added to this project yet.
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Due Date</label>
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

            <div className="form-row">
              <div className="form-group">
                <label>Estimated Hours</label>
                <input
                  type="number"
                  step="0.5"
                  name="estimatedHours"
                  className="form-input"
                  placeholder="e.g. 16"
                  value={formData.estimatedHours}
                  onChange={handleChange}
                  disabled={!isProjectManager}
                />
              </div>

              <div className="form-group">
                <label>Hours Logged / Spent</label>
                <input
                  type="number"
                  step="0.5"
                  name="spentHours"
                  className="form-input"
                  placeholder="e.g. 8"
                  value={formData.spentHours}
                  onChange={handleChange}
                  disabled={!isProjectManager}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Labels / Tags (Comma-separated)</label>
              <input
                type="text"
                name="labels"
                className="form-input"
                placeholder="Backend, Security, High-Impact"
                value={formData.labels}
                onChange={handleChange}
                disabled={!isProjectManager}
              />
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              {taskToEdit && isProjectManager ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete task "${taskToEdit.title}"?`)) {
                      onDelete(taskToEdit.id);
                      onClose();
                    }
                  }}
                >
                  <Trash2 size={15} />
                  Delete Task
                </button>
              ) : <div></div>}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  {isProjectManager ? 'Cancel' : 'Close'}
                </button>
                {isProjectManager && (
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : taskToEdit ? 'Update Task' : 'Create Task'}</span>
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: COMMENTS */}
        {activeTab === 'comments' && (
          <div className="detail-section">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No comments yet. Leave the first note for the team!
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id || Math.random()} className="comment-bubble">
                    <div className="comment-author-row">
                      <strong style={{ color: '#4f46e5' }}>{c.author}</strong>
                      <span>{c.timestamp ? new Date(c.timestamp).toLocaleString() : ''}</span>
                    </div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem' }}>{c.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.65rem', marginTop: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Write a message, update, or blocker note..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingComment || !newCommentText.trim()}
              >
                <Send size={15} />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: ACTIVITY LOG */}
        {activeTab === 'activity' && (
          <div className="detail-section">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
              {activityLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No activity history logged yet.
                </div>
              ) : (
                activityLog.map((a, idx) => (
                  <div key={a.id || idx} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.825rem'
                  }}>
                    <Clock size={16} color="#4f46e5" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.user || 'System'}</span>
                        <span>{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span>
                      </div>
                      <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>{a.details}</div>
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
