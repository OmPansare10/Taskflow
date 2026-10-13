import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  FolderPlus,
  Save,
  Trash2,
  AlertCircle,
  Tag,
  DollarSign,
  Calendar,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';

export default function ProjectFormPage({
  projectToEdit = null,
  currentUser = null,
  teamMembers = [],
  onSave,
  onDelete,
  onBack,
  isProjectManager = true
}) {
  const currentUserName = currentUser
    ? (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.name)
    : 'Project Manager';

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
  }, [projectToEdit, currentUserName]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'title' && !projectToEdit && !formData.key) {
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
        name: 'Project Manager',
        role: 'Project Manager',
        avatar: 'PM',
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
      if (onBack) {
        onBack();
      }
    } catch (err) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!projectToEdit) return;
    if (window.confirm(`Are you sure you want to delete project "${projectToEdit.title}" and all its tasks? This action cannot be undone.`)) {
      onDelete(projectToEdit.id);
    }
  };

  const parsedTags = formData.tags
    ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="full-page-view project-form-page" id="project-form-page">
      {/* Breadcrumb Header Bar */}
      <div className="page-breadcrumb-bar">
        <div className="breadcrumb-trail">
          <span className="breadcrumb-dim">Projects</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">
            {projectToEdit ? `Edit: ${projectToEdit.title}` : 'Create New Project'}
          </span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onBack}
          id="project-form-back-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Projects</span>
        </button>
      </div>

      <div className="page-main-container">
        {/* Page Title Header */}
        <div className="page-header-card">
          <div className="page-header-icon-box">
            <FolderPlus size={26} color="var(--accent-primary)" />
          </div>
          <div className="page-header-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0 }}>
                {projectToEdit ? 'Edit Project Settings' : 'Create New Project'}
              </h1>
              {projectToEdit && (
                <span className="project-key-tag" style={{ fontSize: '0.85rem', padding: '0.2rem 0.6rem' }}>
                  {projectToEdit.key}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
              Configure project identity, timeline milestones, budget allocation, and operational priority.
            </p>
          </div>
        </div>

        {error && (
          <div className="profile-alert alert-error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="page-two-col-grid">
            {/* Left Column: Scope & Identity */}
            <div className="page-card">
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={16} color="var(--accent-primary)" />
                <span>Project Identity & Scope</span>
              </h3>

              <div className="form-group">
                <label className="form-label" htmlFor="project-title-input">
                  Project Title *
                </label>
                <input
                  type="text"
                  id="project-title-input"
                  name="title"
                  className="form-input"
                  placeholder="e.g. NextGen Cloud Platform"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label" htmlFor="project-key-input">
                    Project Key * (Task Prefix)
                  </label>
                  <input
                    type="text"
                    id="project-key-input"
                    name="key"
                    className="form-input text-mono"
                    placeholder="e.g. CLOUD"
                    value={formData.key}
                    onChange={handleChange}
                    maxLength={6}
                    required
                    style={{ textTransform: 'uppercase', fontWeight: 700 }}
                  />
                  <span className="field-note">Used as task identifier (e.g. {formData.key || 'KEY'}-101)</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="project-manager-input">
                    Project Lead / Manager
                  </label>
                  <input
                    type="text"
                    id="project-manager-input"
                    name="manager"
                    className="form-input"
                    placeholder="Manager Name"
                    value={formData.manager}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="project-description-input">
                  Description & Deliverables
                </label>
                <textarea
                  id="project-description-input"
                  name="description"
                  className="form-textarea"
                  rows={4}
                  placeholder="Outline high-level goals, key deliverables, target milestones, and technical requirements..."
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="project-tags-input">
                  Tags & Categories (Comma-separated)
                </label>
                <input
                  type="text"
                  id="project-tags-input"
                  name="tags"
                  className="form-input"
                  placeholder="Frontend, Cloud, Security, Q4"
                  value={formData.tags}
                  onChange={handleChange}
                />
                {parsedTags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                    {parsedTags.map((t, idx) => (
                      <span key={idx} className="project-role-tag" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Execution & Budget */}
            <div className="page-card">
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} color="var(--accent-primary)" />
                <span>Execution, Budget & Priority</span>
              </h3>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Project Status</label>
                  <select
                    name="status"
                    className="form-select"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    name="priority"
                    className="form-select"
                    value={formData.priority}
                    onChange={handleChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="project-budget-input">
                  Budget Allocation ($ USD)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <DollarSign size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="number"
                    id="project-budget-input"
                    name="budget"
                    className="form-input"
                    placeholder="e.g. 50000"
                    value={formData.budget}
                    onChange={handleChange}
                    style={{ paddingLeft: '2.2rem' }}
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    className="form-input"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Delivery Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    className="form-input"
                    value={formData.dueDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Enterprise Info Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <Sparkles size={18} color="#6366f1" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.5 }}>
                  <strong style={{ color: '#0f172a' }}>Collaborative Project Flow:</strong> Once created, you can invite team members, assign tasks across Kanban workflow columns, and export audit trails.
                </div>
              </div>
            </div>
          </div>

          {/* Form Action Footer Bar */}
          <div className="page-action-bar">
            {projectToEdit && isProjectManager ? (
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={handleDelete}
                id="delete-project-page-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Trash2 size={16} />
                <span>Delete Project</span>
              </button>
            ) : <div />}

            <div style={{ display: 'flex', gap: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onBack}
                id="cancel-project-page-btn"
              >
                Discard & Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                id="save-project-page-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.5rem', fontWeight: 700 }}
              >
                <Save size={16} />
                <span>{saving ? 'Saving Project...' : projectToEdit ? 'Save Changes' : 'Create Project'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
