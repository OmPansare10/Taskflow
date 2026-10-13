import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Key,
  Lock,
  Eye,
  EyeOff,
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  LogOut,
  X,
  RefreshCw,
  Briefcase,
  Hash,
  Sparkles,
  Edit3,
  Layers,
  FolderKanban,
  CheckSquare
} from 'lucide-react';
import { api } from '../api';

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'security' | 'edit'
  const [profileData, setProfileData] = useState(currentUser || null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Edit Profile State
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (isOpen && currentUser) {
      setProfileData(currentUser);
      setEditFirstName(currentUser.firstName || currentUser.name?.split(' ')[0] || '');
      setEditLastName(currentUser.lastName || currentUser.name?.split(' ').slice(1).join(' ') || '');
      setEditRole(currentUser.role || 'Project Manager');
      setPasswordSuccess('');
      setPasswordError('');
      setEditSuccess('');
      setEditError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchLatestProfile();
    }
  }, [isOpen, currentUser]);

  const fetchLatestProfile = async () => {
    if (!currentUser) return;
    setLoadingProfile(true);
    try {
      const data = await api.getProfile({
        userId: currentUser.id || currentUser._id,
        email: currentUser.email
      });
      if (data) {
        setProfileData(data);
        if (data.firstName) setEditFirstName(data.firstName);
        if (data.lastName) setEditLastName(data.lastName);
        if (data.role) setEditRole(data.role);
      }
    } catch (err) {
      console.warn('Could not fetch refreshed profile stats:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  if (!isOpen || !currentUser) return null;

  const userDisplayName = profileData?.firstName
    ? `${profileData.firstName} ${profileData.lastName || ''}`.trim()
    : (profileData?.name || currentUser.name || 'User');

  const userAvatar = profileData?.avatar || currentUser.avatar || userDisplayName.substring(0, 2).toUpperCase();
  const userColor = profileData?.color || currentUser.color || '#6366f1';
  const isManager = (profileData?.role || currentUser.role || '').toLowerCase().includes('manager');

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      setPasswordError('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword({
        userId: currentUser.id || currentUser._id,
        email: currentUser.email,
        currentPassword,
        newPassword
      });

      setPasswordSuccess(res.message || 'Password updated successfully! Please remember your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    if (!editFirstName.trim() || !editLastName.trim()) {
      setEditError('First name and last name are required.');
      return;
    }

    setEditLoading(true);
    try {
      const updated = await api.updateProfile({
        userId: currentUser.id || currentUser._id,
        email: currentUser.email,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        role: editRole.trim()
      });

      setProfileData(prev => ({ ...prev, ...updated }));
      if (onUpdateUser) {
        onUpdateUser(updated);
      }
      setEditSuccess('Profile information updated successfully!');
      setTimeout(() => setEditSuccess(''), 3000);
    } catch (err) {
      setEditError(err.message || 'Failed to update profile information.');
    } finally {
      setEditLoading(false);
    }
  };

  // Format created date
  const formatJoinedDate = (dateStr) => {
    if (!dateStr) return 'Active Member';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr.substring(0, 10);
    }
  };

  return (
    <div
      className="modal-overlay profile-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem'
      }}
      id="profile-modal-backdrop"
    >
      <div
        className="modal-content profile-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '660px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
          position: 'relative'
        }}
        id="profile-modal-content"
      >
        {/* Modal Header & Cover */}
        <div className="profile-hero-banner">
          <div className="profile-hero-pattern" />
          <button
            className="profile-close-btn"
            onClick={onClose}
            title="Close Profile"
            id="close-profile-modal-btn"
          >
            <X size={18} />
          </button>

          {/* User Hero Row */}
          <div className="profile-hero-identity">
            <div
              className="profile-avatar-circle"
              style={{ backgroundColor: userColor }}
            >
              <span>{userAvatar}</span>
              <span className="profile-online-badge" title="Online" />
            </div>

            <div className="profile-identity-info">
              <div className="profile-title-row">
                <h2 className="profile-user-fullname">{userDisplayName}</h2>
                <span className={`profile-role-pill ${isManager ? 'pill-manager' : 'pill-member'}`}>
                  {isManager ? <ShieldCheck size={13} /> : <User size={13} />}
                  <span>{profileData?.role || currentUser.role || 'Member'}</span>
                </span>
              </div>
              <div className="profile-handle-row">
                <span className="profile-email-tag">{profileData?.email || currentUser.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="profile-nav-tabs">
          <button
            className={`profile-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
            id="profile-tab-info"
          >
            <User size={15} />
            <span>Profile Information</span>
          </button>
          <button
            className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            id="profile-tab-security"
          >
            <Key size={15} />
            <span>Security & Password</span>
          </button>
          <button
            className={`profile-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
            id="profile-tab-edit"
          >
            <Edit3 size={15} />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="profile-modal-body">
          {/* TAB 1: PROFILE INFORMATION */}
          {activeTab === 'info' && (
            <div className="profile-tab-content info-tab">
              {/* Stats Overview Grid */}
              <div className="profile-stats-grid">
                <div className="profile-stat-card">
                  <div className="stat-card-icon icon-projects">
                    <FolderKanban size={18} />
                  </div>
                  <div className="stat-card-details">
                    <span className="stat-number">{profileData?.stats?.projectsCount ?? 1}</span>
                    <span className="stat-label">Active Projects</span>
                  </div>
                </div>

                <div className="profile-stat-card">
                  <div className="stat-card-icon icon-tasks">
                    <CheckSquare size={18} />
                  </div>
                  <div className="stat-card-details">
                    <span className="stat-number">{profileData?.stats?.assignedTasksCount ?? 0}</span>
                    <span className="stat-label">Assigned Tasks</span>
                  </div>
                </div>

                <div className="profile-stat-card">
                  <div className="stat-card-icon icon-completed">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="stat-card-details">
                    <span className="stat-number">{profileData?.stats?.completedTasksCount ?? 0}</span>
                    <span className="stat-label">Completed Tasks</span>
                  </div>
                </div>

                <div className="profile-stat-card">
                  <div className="stat-card-icon icon-role">
                    <Sparkles size={18} />
                  </div>
                  <div className="stat-card-details">
                    <span className="stat-number" style={{ fontSize: '1rem', textTransform: 'capitalize' }}>
                      {isManager ? 'Manager' : 'Contributor'}
                    </span>
                    <span className="stat-label">System Access</span>
                  </div>
                </div>
              </div>

              {/* Account Details Group */}
              <div className="profile-details-section">
                <h3 className="section-title">Account Details</h3>

                <div className="details-card-grid">
                  {/* Full Name */}
                  <div className="detail-item-box">
                    <div className="detail-item-label">
                      <User size={13} />
                      <span>Full Name</span>
                    </div>
                    <div className="detail-item-value">
                      <span>{userDisplayName}</span>
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(userDisplayName, 'name')}
                        title="Copy name"
                      >
                        {copiedField === 'name' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Primary Email */}
                  <div className="detail-item-box">
                    <div className="detail-item-label">
                      <Mail size={13} />
                      <span>Email Address</span>
                    </div>
                    <div className="detail-item-value">
                      <span className="text-truncate">{profileData?.email || currentUser.email}</span>
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(profileData?.email || currentUser.email, 'email')}
                        title="Copy email"
                      >
                        {copiedField === 'email' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>



                  {/* Role & Permissions */}
                  <div className="detail-item-box">
                    <div className="detail-item-label">
                      <Briefcase size={13} />
                      <span>Designation / Role</span>
                    </div>
                    <div className="detail-item-value">
                      <span style={{ fontWeight: 600 }}>{profileData?.role || currentUser.role || 'Project Member'}</span>
                    </div>
                  </div>

                  {/* Account Created Date */}
                  <div className="detail-item-box">
                    <div className="detail-item-label">
                      <Calendar size={13} />
                      <span>Member Since</span>
                    </div>
                    <div className="detail-item-value">
                      <span>{formatJoinedDate(profileData?.createdAt || currentUser.createdAt)}</span>
                    </div>
                  </div>

                  {/* Account ID */}
                  <div className="detail-item-box">
                    <div className="detail-item-label">
                      <Layers size={13} />
                      <span>Account ID</span>
                    </div>
                    <div className="detail-item-value">
                      <span className="text-mono">
                        {(profileData?.id || profileData?._id || currentUser.id || currentUser._id || 'USR-MAIN').substring(0, 16)}...
                      </span>
                      <button
                        className="copy-btn"
                        onClick={() => copyToClipboard(profileData?.id || profileData?._id || currentUser.id || currentUser._id, 'id')}
                        title="Copy ID"
                      >
                        {copiedField === 'id' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Permissions Card */}
              <div className="permissions-summary-card">
                <div className="permissions-header">
                  <ShieldCheck size={16} color={isManager ? '#4f46e5' : '#0284c7'} />
                  <h4>Permissions & Workspace Privileges</h4>
                </div>
                <div className="permissions-list">
                  {isManager ? (
                    <>
                      <div className="permission-item">
                        <CheckCircle2 size={13} color="#10b981" />
                        <span>Create and manage enterprise projects & teams</span>
                      </div>
                      <div className="permission-item">
                        <CheckCircle2 size={13} color="#10b981" />
                        <span>Assign tasks, edit priorities, and manage stage workflows</span>
                      </div>
                      <div className="permission-item">
                        <CheckCircle2 size={13} color="#10b981" />
                        <span>Exclusive access to Team Activity Auditing & Excel (.xlsx) export</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="permission-item">
                        <CheckCircle2 size={13} color="#10b981" />
                        <span>Access assigned projects and participate in team tasks</span>
                      </div>
                      <div className="permission-item">
                        <CheckCircle2 size={13} color="#10b981" />
                        <span>Drag & update task progress across Kanban workflow columns</span>
                      </div>
                      <div className="permission-item">
                        <CheckCircle2 size={13} color="#10b981" />
                        <span>Post comments and collaborate on project deliverables</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Associated Projects Section (if any) */}
              {profileData?.stats?.projects && profileData.stats.projects.length > 0 && (
                <div className="profile-projects-section">
                  <h3 className="section-title">Associated Projects</h3>
                  <div className="project-chips-container">
                    {profileData.stats.projects.map((proj) => (
                      <div key={proj.id} className="project-chip">
                        <span className="project-key-tag">{proj.key || 'PRJ'}</span>
                        <span className="project-title-tag">{proj.title}</span>
                        <span className="project-role-tag">{proj.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECURITY & CHANGE PASSWORD */}
          {activeTab === 'security' && (
            <div className="profile-tab-content security-tab">
              <div className="security-notice-card">
                <div className="notice-icon">
                  <Lock size={20} />
                </div>
                <div>
                  <h4 className="notice-title">Change Account Password</h4>
                  <p className="notice-desc">
                    For enhanced security, choose a strong password with at least 6 characters.
                    Once changed, you will use your new password for future sign-ins.
                  </p>
                </div>
              </div>

              {passwordSuccess && (
                <div className="profile-alert alert-success">
                  <CheckCircle2 size={16} />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="profile-alert alert-error">
                  <AlertCircle size={16} />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="password-change-form">
                {/* Current Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-current-password">
                    Current Password
                  </label>
                  <div className="password-input-wrap">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="profile-current-password"
                      className="form-input"
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      tabIndex="-1"
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-new-password">
                    New Password
                  </label>
                  <div className="password-input-wrap">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="profile-new-password"
                      className="form-input"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex="-1"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {newPassword.length > 0 && (
                    <div className="password-hint">
                      {newPassword.length >= 6 ? (
                        <span className="hint-ok">
                          <Check size={12} /> Password meets minimum length (6+ chars)
                        </span>
                      ) : (
                        <span className="hint-warn">
                          Needs at least {6 - newPassword.length} more characters
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-confirm-password">
                    Confirm New Password
                  </label>
                  <div className="password-input-wrap">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="profile-confirm-password"
                      className="form-input"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex="-1"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className="password-hint">
                      {newPassword === confirmPassword ? (
                        <span className="hint-ok">
                          <Check size={12} /> Passwords match!
                        </span>
                      ) : (
                        <span className="hint-warn">
                          Passwords do not match yet
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-action-row">
                  <button
                    type="submit"
                    className="btn btn-primary btn-save-password"
                    disabled={passwordLoading || !currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                    id="save-new-password-btn"
                  >
                    {passwordLoading ? (
                      <>
                        <RefreshCw size={15} className="spinning" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <Key size={15} />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: EDIT PROFILE */}
          {activeTab === 'edit' && (
            <div className="profile-tab-content edit-tab">
              {editSuccess && (
                <div className="profile-alert alert-success">
                  <CheckCircle2 size={16} />
                  <span>{editSuccess}</span>
                </div>
              )}

              {editError && (
                <div className="profile-alert alert-error">
                  <AlertCircle size={16} />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleProfileUpdate} className="edit-profile-form">
                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-first-name">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="edit-first-name"
                      className="form-input"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-last-name">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="edit-last-name"
                      className="form-input"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-role">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    id="edit-role"
                    className="form-input"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="e.g. Project Manager, Senior Engineer, DevOps Specialist"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Email Address (Read-only)
                  </label>
                  <input
                    type="text"
                    className="form-input disabled-input"
                    value={profileData?.email || currentUser.email}
                    disabled
                  />
                  <span className="field-note">Primary email is managed by your system administrator.</span>
                </div>

                <div className="form-action-row">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={editLoading || !editFirstName.trim() || !editLastName.trim()}
                    id="save-profile-btn"
                  >
                    {editLoading ? (
                      <>
                        <RefreshCw size={15} className="spinning" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer with Logout Option */}
        <div className="profile-modal-footer">
          <button
            className="btn btn-outline-danger"
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
            id="profile-logout-btn"
          >
            <LogOut size={14} />
            <span>Sign Out of TaskFlow</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
