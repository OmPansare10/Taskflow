import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Save, AlertCircle } from 'lucide-react';

export default function ProjectModal({ isOpen, onClose, onSave, projectToEdit, currentUser, teamMembers = [] }) {
  const currentUserName = currentUser
    ? (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.name)
    : 'Alex Mercer';

  const [formData, setFormData] = useState({
    title: '',
    key: '',
    description: '',
    status: 'active',
    priority: 'medium',
    manager: currentUserName,
    budget: '',
    startDate: new Date().toISOString().substring(0, 10),
    dueDate: '',
    tags: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projectToEdit) {
      setFormData({
        title: projectToEdit.title || '',
        key: projectToEdit.key || '',
        description: projectToEdit.description || '',
        status: projectToEdit.status || 'active',
        priority: projectToEdit.priority || 'medium',
        manager: projectToEdit.manager || currentUserName,
        budget: projectToEdit.budget ? String(projectToEdit.budget) : '',
        startDate: projectToEdit.startDate || new Date().toISOString().substring(0, 10),
        dueDate: projectToEdit.dueDate || '',
        tags: Array.isArray(projectToEdit.tags) ? projectToEdit.tags.join(', ') : ''
      });
    } else {
      setFormData({
        title: '',
        key: '',
        description: '',
        status: 'active',
        priority: 'medium',
        manager: currentUserName,
        budget: '',
        startDate: new Date().toISOString().substring(0, 10),
        dueDate: '',
        tags: 'Core, Engineering'
      });
    }
    setError('');
  }, [projectToEdit, isOpen, currentUserName]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'title' && !projectToEdit && !formData.key) {
      // Auto suggest key from title
      const words = value.trim().split(/\s+/);
      const suggestedKey = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
      setFormData(prev => ({ ...prev, [name]: value, key: suggestedKey }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Project title is required');
      return;
    }
    if (!formData.key.trim()) {
      setError('Project key is required (e.g. PRJ)');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const creatorMember = currentUser ? {
        id: currentUser.id || currentUser._id || 'u_' + Date.now(),
        name: currentUserName,
        role: currentUser.role || 'Project Manager',
        email: currentUser.email || '',
        avatar: currentUser.avatar || currentUserName.slice(0, 2).toUpperCase(),
        color: currentUser.color || '#6366f1'
      } : {
        id: 'u1',
        name: 'Alex Mercer',
        role: 'Project Manager',
        avatar: 'AM',
        color: '#6366f1'
      };

      const payload = {
        ...formData,
        key: formData.key.trim().toUpperCase(),
        manager: formData.manager || currentUserName,
        managerEmail: currentUser?.email || '',
        createdBy: currentUser?.id || currentUser?._id || '',
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        ...(!projectToEdit ? { teamMembers: [creatorMember] } : {})
      };
      await onSave(payload, projectToEdit?.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FolderPlus size={22} color="var(--accent-primary)" />
            <h3>{projectToEdit ? 'Edit Project' : 'Create New Project'}</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            padding: '0.75rem',
            color: '#f87171',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Project Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                placeholder="e.g. NextGen Mobile Platform"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Project Key * (Prefix for tasks)</label>
              <input
                type="text"
                name="key"
                className="form-input"
                placeholder="e.g. NMP"
                value={formData.key}
                onChange={handleChange}
                maxLength={6}
                required
                style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div className="form-group">
              <label>Project Manager</label>
              <input
                type="text"
                name="manager"
                className="form-input"
                placeholder="Manager Name"
                value={formData.manager}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description & Scope</label>
            <textarea
              name="description"
              className="form-textarea"
              rows={3}
              placeholder="Outline project objectives, milestones, deliverables..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select name="priority" className="form-select" value={formData.priority} onChange={handleChange}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Budget Allocation ($ USD)</label>
              <input
                type="number"
                name="budget"
                className="form-input"
                placeholder="e.g. 50000"
                value={formData.budget}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Target Delivery Date</label>
              <input
                type="date"
                name="dueDate"
                className="form-input"
                value={formData.dueDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Tags (Comma-separated)</label>
            <input
              type="text"
              name="tags"
              className="form-input"
              placeholder="Frontend, API, Cloud, Q4"
              value={formData.tags}
              onChange={handleChange}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : projectToEdit ? 'Save Changes' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
