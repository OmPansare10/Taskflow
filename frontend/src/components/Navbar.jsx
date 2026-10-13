import React from 'react';
import { Layers, Plus, LogOut, LogIn } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Navbar({
  onOpenNewProject,
  activeRole,
  currentUser,
  onLogout,
  onOpenProfile,
  onGoToLanding,
  onGoToLogin,
  notifications = [],
  onRefreshNotifications,
  onRefreshTeam,
  onNavigateToTask,
  onNavigateToProject,
  onNavigateToTeam
}) {
  const userDisplayName = currentUser
    ? (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.name)
    : 'User';

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="brand-wrapper" onClick={onGoToLanding} title="TaskFlow">
        <div className="brand-icon">
          <Layers size={20} />
        </div>
        <span className="brand-name">TaskFlow</span>
      </div>

      {/* Nav Actions */}
      <div className="nav-actions">

        {/* New Project Button */}
        {activeRole === 'manager' && (
          <button className="btn btn-primary" onClick={onOpenNewProject}>
            <Plus size={15} />
            <span>New Project</span>
          </button>
        )}

        {/* Notification Bell & User Profile & Logout */}
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <NotificationBell
              currentUser={currentUser}
              notifications={notifications}
              onRefreshNotifications={onRefreshNotifications}
              onRefreshTeam={onRefreshTeam}
              onNavigateToTask={onNavigateToTask}
              onNavigateToProject={onNavigateToProject}
              onNavigateToTeam={onNavigateToTeam}
            />
            <button
              type="button"
              className="user-avatar user-avatar-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onOpenProfile) onOpenProfile();
              }}
              style={{
                backgroundColor: currentUser.color || '#6366f1',
                width: '36px',
                height: '36px',
                minWidth: '36px',
                minHeight: '36px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(255, 255, 255, 0.85)',
                cursor: 'pointer',
                padding: 0,
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.15s ease',
              }}
              title={`Click to open Profile & Settings: ${userDisplayName} (${currentUser.role || 'Member'})`}
              id="user-profile-btn"
            >
              <span
                className="user-avatar-text"
                style={{
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  letterSpacing: '0.02em',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
              >
                {currentUser.avatar || userDisplayName.substring(0, 2).toUpperCase()}
              </span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={onLogout}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', gap: '0.35rem' }}
              title="Sign Out"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={onGoToLogin} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>
            <LogIn size={14} />
            <span>Login</span>
          </button>
        )}
      </div>
    </nav>
  );
}
