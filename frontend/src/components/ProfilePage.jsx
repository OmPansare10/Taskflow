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
  ArrowLeft,
  RefreshCw,
  Briefcase,
  Hash,
  Sparkles,
  Edit3,
  Layers,
  FolderKanban,
  CheckSquare,
  X
} from 'lucide-react';
import { api } from '../api';

export default function ProfilePage({
  currentUser,
  onUpdateUser,
  onLogout,
  onBack
}) {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  const [isEditing, setIsEditing] = useState(false);
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
    if (currentUser) {
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
  }, [currentUser]);

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

  const userDisplayName = profileData?.firstName
    ? `${profileData.firstName} ${profileData.lastName || ''}`.trim()
    : (profileData?.name || currentUser?.name || 'User');

  const userAvatar = profileData?.avatar || currentUser?.avatar || userDisplayName.substring(0, 2).toUpperCase();
  const userColor = profileData?.color || currentUser?.color || '#6366f1';
  const isManager = (profileData?.role || currentUser?.role || '').toLowerCase().includes('manager');

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

      setPasswordSuccess(res.message || 'Password updated successfully!');
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
      setEditSuccess('Profile updated successfully!');
      setTimeout(() => {
        setEditSuccess('');
        setIsEditing(false);
      }, 1000);
    } catch (err) {
      setEditError(err.message || 'Failed to update profile information.');
    } finally {
      setEditLoading(false);
    }
  };

  const cancelEditing = () => {
    setEditFirstName(profileData?.firstName || currentUser?.firstName || currentUser?.name?.split(' ')[0] || '');
    setEditLastName(profileData?.lastName || currentUser?.lastName || currentUser?.name?.split(' ').slice(1).join(' ') || '');
    setEditRole(profileData?.role || currentUser?.role || 'Project Manager');
    setEditError('');
    setEditSuccess('');
    setIsEditing(false);
  };

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
    <div className="full-page-view profile-page-view" id="profile-page-view">
      {/* Breadcrumb & Navigation Bar */}
      <div className="page-breadcrumb-bar">
        <div className="breadcrumb-trail">
          <span className="breadcrumb-dim">Workspace</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Account & Profile</span>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onBack}
          id="profile-back-btn"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Projects</span>
        </button>
      </div>

      <div className="page-main-container">
        {/* Simple & Clean Profile Header Card */}
        <div className="profile-simple-header-card">
          <div className="profile-header-main-row">
            <div className="profile-header-identity">
              <div
                className="profile-simple-avatar"
                style={{ backgroundColor: userColor }}
              >
                <span>{userAvatar}</span>
                <span className="profile-simple-online-dot" title="Active Account" />
              </div>

              <div className="profile-header-identity-text">
                <div className="profile-header-name-row">
                  <h1 className="profile-header-fullname">{userDisplayName}</h1>
                  <span className={`profile-role-pill-clean ${isManager ? 'pill-manager' : 'pill-member'}`}>
                    {isManager ? <ShieldCheck size={13} /> : <User size={13} />}
                    <span>{profileData?.role || currentUser?.role || 'Member'}</span>
                  </span>
                </div>
                <div className="profile-header-meta">
                  <span className="meta-item">{profileData?.email || currentUser?.email}</span>
                  <span className="meta-dot">•</span>
                  <span className="meta-item">Joined {formatJoinedDate(profileData?.createdAt || currentUser?.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="profile-header-actions">
              <button
                className="btn btn-secondary profile-edit-toggle-btn"
                onClick={() => {
                  if (isEditing) {
                    cancelEditing();
                  } else {
                    setActiveTab('profile');
                    setIsEditing(true);
                  }
                }}
                id="profile-edit-toggle-btn"
              >
                {isEditing ? (
                  <>
                    <X size={15} />
                    <span>Cancel Edit</span>
                  </>
                ) : (
                  <>
                    <Edit3 size={15} />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
              <button
                className="btn btn-outline-danger profile-signout-header-btn"
                onClick={onLogout}
                id="profile-header-signout-btn"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Clean Stats Strip */}
          <div className="profile-stats-strip">
            <div className="profile-stat-box">
              <div className="stat-box-icon icon-projects">
                <FolderKanban size={17} />
              </div>
              <div className="stat-box-data">
                <span className="stat-box-number">{profileData?.stats?.projectsCount ?? 1}</span>
                <span className="stat-box-label">Active Projects</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-box-icon icon-tasks">
                <CheckSquare size={17} />
              </div>
              <div className="stat-box-data">
                <span className="stat-box-number">{profileData?.stats?.assignedTasksCount ?? 0}</span>
                <span className="stat-box-label">Assigned Tasks</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-box-icon icon-completed">
                <CheckCircle2 size={17} />
              </div>
              <div className="stat-box-data">
                <span className="stat-box-number">{profileData?.stats?.completedTasksCount ?? 0}</span>
                <span className="stat-box-label">Completed Tasks</span>
              </div>
            </div>

            <div className="profile-stat-box">
              <div className="stat-box-icon icon-role">
                <Sparkles size={17} />
              </div>
              <div className="stat-box-data">
                <span className="stat-box-number" style={{ fontSize: '1.05rem', textTransform: 'capitalize' }}>
                  {isManager ? 'Manager' : 'Contributor'}
                </span>
                <span className="stat-box-label">System Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Clean Navigation Tabs */}
        <div className="profile-simple-tabs-bar">
          <div className="profile-segmented-control">
            <button
              className={`segmented-btn ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('profile');
              }}
              id="profile-tab-info"
            >
              <User size={15} />
              <span>Profile Information</span>
            </button>
            <button
              className={`segmented-btn ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('security');
                setIsEditing(false);
              }}
              id="profile-tab-security"
            >
              <Key size={15} />
              <span>Security & Password</span>
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="profile-tab-content-area">
          {activeTab === 'profile' && (
            <div className="profile-content-card">
              {isEditing ? (
                /* INLINE EDIT MODE */
                <div className="profile-edit-section">
                  <div className="content-card-header">
                    <div>
                      <h3 className="content-card-title">Edit Profile Information</h3>
                      <p className="content-card-subtitle">Update your personal identity and workspace role.</p>
                    </div>
                  </div>

                  {editSuccess && (
                    <div className="profile-alert alert-success">
                      <CheckCircle2 size={18} />
                      <span>{editSuccess}</span>
                    </div>
                  )}

                  {editError && (
                    <div className="profile-alert alert-error">
                      <AlertCircle size={18} />
                      <span>{editError}</span>
                    </div>
                  )}

                  <form onSubmit={handleProfileUpdate} className="profile-form-clean">
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
                          placeholder="e.g. Om"
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
                          placeholder="e.g. Pansare"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-role">
                        Role / Designation
                      </label>
                      <input
                        type="text"
                        id="edit-role"
                        className="form-input"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        placeholder="e.g. Project Manager, Lead Engineer"
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
                        value={profileData?.email || currentUser?.email}
                        disabled
                      />
                      <span className="field-note">Primary email is managed by your workspace administrator.</span>
                    </div>

                    <div className="profile-form-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={cancelEditing}
                        disabled={editLoading}
                      >
                        Cancel
                      </button>
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
              ) : (
                /* READ-ONLY VIEW MODE */
                <div className="profile-details-clean-section">
                  <div className="content-card-header">
                    <div>
                      <h3 className="content-card-title">Personal Details</h3>
                      <p className="content-card-subtitle">Your profile information and contact details.</p>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsEditing(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem' }}
                      id="profile-inline-edit-btn"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="details-clean-grid">
                    <div className="detail-clean-item">
                      <span className="detail-clean-label">Full Name</span>
                      <div className="detail-clean-val-row">
                        <span className="detail-clean-value">{userDisplayName}</span>
                        <button
                          className="copy-btn-clean"
                          onClick={() => copyToClipboard(userDisplayName, 'name')}
                          title="Copy name"
                        >
                          {copiedField === 'name' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="detail-clean-item">
                      <span className="detail-clean-label">Email Address</span>
                      <div className="detail-clean-val-row">
                        <span className="detail-clean-value text-truncate">{profileData?.email || currentUser?.email}</span>
                        <button
                          className="copy-btn-clean"
                          onClick={() => copyToClipboard(profileData?.email || currentUser?.email, 'email')}
                          title="Copy email"
                        >
                          {copiedField === 'email' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="detail-clean-item">
                      <span className="detail-clean-label">Designation / Role</span>
                      <div className="detail-clean-val-row">
                        <span className="detail-clean-value" style={{ fontWeight: 600 }}>
                          {profileData?.role || currentUser?.role || 'Project Member'}
                        </span>
                      </div>
                    </div>

                    <div className="detail-clean-item">
                      <span className="detail-clean-label">Member Since</span>
                      <div className="detail-clean-val-row">
                        <span className="detail-clean-value">
                          {formatJoinedDate(profileData?.createdAt || currentUser?.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="detail-clean-item">
                      <span className="detail-clean-label">Account ID</span>
                      <div className="detail-clean-val-row">
                        <span className="detail-clean-value text-mono">
                          {(profileData?.id || profileData?._id || currentUser?.id || currentUser?._id || 'USR-MAIN').substring(0, 18)}...
                        </span>
                        <button
                          className="copy-btn-clean"
                          onClick={() => copyToClipboard(profileData?.id || profileData?._id || currentUser?.id || currentUser?._id, 'id')}
                          title="Copy ID"
                        >
                          {copiedField === 'id' ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Summary Banner */}
                  <div className="permissions-clean-box">
                    <div className="permissions-clean-header">
                      <ShieldCheck size={16} color={isManager ? '#4f46e5' : '#0284c7'} />
                      <span>Workspace Privileges & Access</span>
                    </div>
                    <div className="permissions-clean-list">
                      {isManager ? (
                        <>
                          <div className="perm-clean-item">
                            <CheckCircle2 size={14} color="#10b981" />
                            <span>Create and manage enterprise projects & team members</span>
                          </div>
                          <div className="perm-clean-item">
                            <CheckCircle2 size={14} color="#10b981" />
                            <span>Assign tasks, edit priorities, and manage stage workflows</span>
                          </div>
                          <div className="perm-clean-item">
                            <CheckCircle2 size={14} color="#10b981" />
                            <span>Exclusive access to Team Activity Auditing & Excel (.xlsx) export</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="perm-clean-item">
                            <CheckCircle2 size={14} color="#10b981" />
                            <span>Access assigned projects and participate in team tasks</span>
                          </div>
                          <div className="perm-clean-item">
                            <CheckCircle2 size={14} color="#10b981" />
                            <span>Drag & update task progress across Kanban workflow columns</span>
                          </div>
                          <div className="perm-clean-item">
                            <CheckCircle2 size={14} color="#10b981" />
                            <span>Post comments and collaborate on project deliverables</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Associated Projects Section (if any) */}
                  {profileData?.stats?.projects && profileData.stats.projects.length > 0 && (
                    <div className="projects-clean-section">
                      <h4 className="projects-clean-title">Associated Projects</h4>
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
            </div>
          )}

          {activeTab === 'security' && (
            <div className="profile-content-card">
              <div className="content-card-header">
                <div>
                  <h3 className="content-card-title">Change Account Password</h3>
                  <p className="content-card-subtitle">Ensure your account is protected with a strong password.</p>
                </div>
              </div>

              {passwordSuccess && (
                <div className="profile-alert alert-success">
                  <CheckCircle2 size={18} />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="profile-alert alert-error">
                  <AlertCircle size={18} />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="password-change-form">
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
                          <Check size={13} /> Minimum length met (6+ characters)
                        </span>
                      ) : (
                        <span className="hint-warn">
                          Needs at least {6 - newPassword.length} more character{6 - newPassword.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

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
                          <Check size={13} /> Passwords match
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
        </div>

        {/* Danger Zone / Session Management */}
        <div className="profile-simple-danger-card">
          <div className="danger-card-info">
            <h4 className="danger-card-title">Session Management</h4>
            <p className="danger-card-desc">Sign out of your active TaskFlow session on this browser.</p>
          </div>
          <button
            className="btn btn-outline-danger"
            onClick={onLogout}
            id="profile-signout-btn"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
