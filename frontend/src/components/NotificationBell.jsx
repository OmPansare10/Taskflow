import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  X,
  UserPlus,
  CheckCircle2,
  Clock,
  FolderKanban,
  CheckSquare,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { api } from '../api';

export default function NotificationBell({
  currentUser,
  notifications = [],
  onRefreshNotifications,
  onRefreshTeam,
  onNavigateToTask,
  onNavigateToProject,
  onNavigateToTeam
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'requests' | 'tasks'
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setActiveTab('all');
      if (onRefreshNotifications) {
        onRefreshNotifications();
      }
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser?.email) return;
    try {
      await api.markNotificationRead({
        all: true,
        userEmail: currentUser.email
      });
      if (onRefreshNotifications) {
        onRefreshNotifications();
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleItemClick = async (notif) => {
    // Mark as read
    if (!notif.isRead) {
      api.markNotificationRead({ id: notif.id || notif._id }).then(() => {
        if (onRefreshNotifications) onRefreshNotifications();
      }).catch(() => {});
    }

    // Navigation depending on type
    if (notif.type === 'task_assigned' || notif.type === 'task_due') {
      const pId = notif.data?.projectId;
      const tId = notif.data?.taskId;
      if (pId && onNavigateToTask) {
        setIsOpen(false);
        onNavigateToTask(pId, tId);
      }
    } else if (notif.type === 'project_added' || notif.type === 'project_due') {
      const pId = notif.data?.projectId;
      if (pId && onNavigateToProject) {
        setIsOpen(false);
        onNavigateToProject(pId);
      }
    } else if (notif.type === 'team_accepted' || notif.type === 'team_request') {
      if (onNavigateToTeam) {
        setIsOpen(false);
        onNavigateToTeam();
      }
    }
  };

  const handleRespondRequest = async (e, notif, action) => {
    e.stopPropagation();
    const notifId = notif.id || notif._id;
    setActionLoadingId(`${notifId}-${action}`);

    try {
      await api.respondTeamRequest({
        notificationId: notifId,
        action: action,
        userEmail: currentUser?.email,
        userId: currentUser?.id || currentUser?._id
      });

      if (onRefreshNotifications) {
        await onRefreshNotifications();
      }
      if (action === 'accept' && onRefreshTeam) {
        await onRefreshTeam();
      }
    } catch (err) {
      alert('Error: ' + (err.message || 'Failed to respond to request'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const requestsCount = notifications.filter(n => n.type === 'team_request' || n.type === 'team_accepted').length;
  const tasksCount = notifications.filter(n => n.type === 'task_assigned' || n.type === 'task_due' || n.type === 'project_due' || n.type === 'project_added').length;

  // Filter list by tab
  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'requests') {
      return n.type === 'team_request' || n.type === 'team_accepted';
    }
    if (activeTab === 'tasks') {
      return n.type === 'task_assigned' || n.type === 'task_due' || n.type === 'project_due' || n.type === 'project_added';
    }
    return true;
  });

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        id="navbar-notification-bell-btn"
        style={{
          background: isOpen ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '50%',
          width: '38px',
          height: '38px',
          minWidth: '38px',
          minHeight: '38px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          color: isOpen ? '#6366f1' : 'var(--text-primary)',
          transition: 'all 0.18s ease',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(99, 102, 241, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)'
        }}
        onMouseOver={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.color = '#6366f1';
          }
        }}
        onMouseOut={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        title="Notifications"
      >
        <Bell size={18} />

        {/* Unread Red Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid var(--bg-primary, #0f172a)',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
              animation: 'pulse 2s infinite'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: '0',
            width: '480px',
            maxWidth: 'calc(100vw - 20px)',
            background: 'var(--bg-secondary, #1e293b)',
            border: '1px solid var(--border-strong, #334155)',
            borderRadius: '16px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.12)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modal-fade 0.2s ease-out'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.1rem 1.35rem 0.85rem',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#6366f1',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    border: '1px solid rgba(99, 102, 241, 0.3)'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  transition: 'background 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-primary)'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                background: activeTab === 'all' ? 'var(--bg-secondary)' : 'transparent',
                border: 'none',
                color: activeTab === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'all' ? 700 : 500,
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>All</span>
              {notifications.length > 0 && (
                <span style={{ fontSize: '0.7rem', opacity: 0.8, background: activeTab === 'all' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.2)', padding: '0.05rem 0.4rem', borderRadius: '999px' }}>
                  {notifications.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              style={{
                background: activeTab === 'requests' ? 'var(--bg-secondary)' : 'transparent',
                border: 'none',
                color: activeTab === 'requests' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'requests' ? 700 : 500,
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'requests' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>Team Requests</span>
              {requestsCount > 0 && (
                <span style={{ fontSize: '0.7rem', opacity: 0.8, background: activeTab === 'requests' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.2)', padding: '0.05rem 0.4rem', borderRadius: '999px' }}>
                  {requestsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              style={{
                background: activeTab === 'tasks' ? 'var(--bg-secondary)' : 'transparent',
                border: 'none',
                color: activeTab === 'tasks' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === 'tasks' ? 700 : 500,
                fontSize: '0.8rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'tasks' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>Tasks & Due Dates</span>
              {tasksCount > 0 && (
                <span style={{ fontSize: '0.7rem', opacity: 0.8, background: activeTab === 'tasks' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.2)', padding: '0.05rem 0.4rem', borderRadius: '999px' }}>
                  {tasksCount}
                </span>
              )}
            </button>
          </div>

          {/* List of Notifications with Custom Scrollbar */}
          <div
            className="notif-scroll-container"
            style={{
              maxHeight: '375px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              padding: '0.35rem 0',
              scrollbarGutter: 'stable'
            }}
          >
            {filteredNotifs.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6366f1'
                  }}
                >
                  <Bell size={20} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  No notifications yet
                </span>
                <span style={{ fontSize: '0.775rem' }}>
                  {activeTab === 'requests'
                    ? 'No team requests pending.'
                    : activeTab === 'tasks'
                    ? 'No task assignments or due date alerts.'
                    : "You're all caught up!"}
                </span>
              </div>
            ) : (
              filteredNotifs.map((notif) => {
                const notifId = notif.id || notif._id;
                const isUnread = !notif.isRead;
                const isTeamRequest = notif.type === 'team_request';
                const isDueNotification = notif.type === 'task_due' || notif.type === 'project_due' || notif.data?.isDueUrgent;
                const isAccepted = notif.status === 'accepted';
                const isDeclined = notif.status === 'declined';
                const isPending = notif.status === 'pending' || (!isAccepted && !isDeclined && isTeamRequest);
                const tagText = notif.data?.tagText;

                return (
                  <div
                    key={notifId}
                    onClick={() => handleItemClick(notif)}
                    style={{
                      padding: '0.95rem 1.25rem',
                      margin: isDueNotification ? '0.35rem 0.75rem' : '0',
                      borderRadius: isDueNotification ? '12px' : '0',
                      borderBottom: isDueNotification ? '1.5px solid #ef4444' : '1px solid var(--border-subtle)',
                      border: isDueNotification ? '1.5px solid #ef4444' : undefined,
                      background: isDueNotification
                        ? (isUnread ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.03)')
                        : (isUnread ? 'rgba(99, 102, 241, 0.05)' : 'transparent'),
                      boxShadow: isDueNotification ? '0 2px 8px rgba(239, 68, 68, 0.12)' : 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseOver={(e) => {
                      if (isDueNotification) {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                      } else {
                        e.currentTarget.style.background = isUnread ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-primary)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (isDueNotification) {
                        e.currentTarget.style.background = isUnread ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.03)';
                      } else {
                        e.currentTarget.style.background = isUnread ? 'rgba(99, 102, 241, 0.05)' : 'transparent';
                      }
                    }}
                  >
                    {/* Unread / Due Left Indicator Pill */}
                    {(isUnread || isDueNotification) && (
                      <span
                        style={{
                          position: 'absolute',
                          left: '4px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '4px',
                          height: '26px',
                          borderRadius: '4px',
                          background: isDueNotification ? '#ef4444' : '#6366f1'
                        }}
                      />
                    )}

                    {/* Sender Avatar / Icon */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: isDueNotification ? '#fee2e2' : (notif.senderColor || '#6366f1'),
                          color: isDueNotification ? '#dc2626' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          border: isDueNotification ? '1.5px solid #fca5a5' : '1px solid rgba(255,255,255,0.2)'
                        }}
                      >
                        {notif.type === 'task_due' || notif.type === 'project_due' ? (
                          '🚨'
                        ) : notif.type === 'task_assigned' ? (
                          <CheckSquare size={17} />
                        ) : notif.type === 'project_added' ? (
                          <FolderKanban size={17} />
                        ) : notif.type === 'team_accepted' ? (
                          <Sparkles size={17} color="#10b981" />
                        ) : (
                          notif.senderAvatar || (notif.senderName ? notif.senderName.substring(0, 2).toUpperCase() : 'TF')
                        )}
                      </div>

                      {/* Small Type Badge overlay */}
                      {isTeamRequest && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '-2px',
                            right: '-2px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#6366f1',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1.5px solid var(--bg-secondary)'
                          }}
                        >
                          <UserPlus size={9} />
                        </span>
                      )}
                    </div>

                    {/* Content Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isDueNotification ? '#b91c1c' : 'var(--text-primary)', lineHeight: 1.25 }}>
                            {notif.title}
                          </span>
                          {tagText && (
                            <span style={{
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '999px',
                              fontSize: '0.675rem',
                              fontWeight: 700
                            }}>
                              {tagText}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {formatTimestamp(notif.createdAt)}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 0.45rem', fontSize: '0.825rem', color: isDueNotification ? '#7f1d1d' : 'var(--text-secondary)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                        {notif.message}
                      </p>

                      {/* TEAM REQUEST ACTIONS (Instagram-like Accept / Decline) */}
                      {isTeamRequest && isPending && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            disabled={Boolean(actionLoadingId)}
                            onClick={(e) => handleRespondRequest(e, notif, 'accept')}
                            style={{
                              background: '#4f46e5',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.775rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#4338ca'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#4f46e5'; }}
                          >
                            {actionLoadingId === `${notifId}-accept` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            <span>Accept</span>
                          </button>

                          <button
                            type="button"
                            disabled={Boolean(actionLoadingId)}
                            onClick={(e) => handleRespondRequest(e, notif, 'decline')}
                            style={{
                              background: 'var(--bg-primary)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.775rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = '#fee2e2';
                              e.currentTarget.style.color = '#dc2626';
                              e.currentTarget.style.borderColor = '#fecaca';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'var(--bg-primary)';
                              e.currentTarget.style.color = 'var(--text-secondary)';
                              e.currentTarget.style.borderColor = 'var(--border-subtle)';
                            }}
                          >
                            {actionLoadingId === `${notifId}-decline` ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <X size={13} />
                            )}
                            <span>Decline</span>
                          </button>
                        </div>
                      )}

                      {/* Request already accepted indicator */}
                      {isTeamRequest && isAccepted && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: '#10b981', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                          <CheckCircle2 size={12} color="#10b981" />
                          <span>Accepted • Teammates</span>
                        </div>
                      )}

                      {/* Request already declined indicator */}
                      {isTeamRequest && isDeclined && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 500, background: 'rgba(148, 163, 184, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                          <X size={12} />
                          <span>Request Declined</span>
                        </div>
                      )}

                      {/* Click to Navigate prompt for tasks & projects */}
                      {(notif.type === 'task_assigned' || notif.type === 'task_due' || notif.type === 'project_added' || notif.type === 'project_due') && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.725rem', color: isDueNotification ? '#dc2626' : '#6366f1', fontWeight: 600, marginTop: '0.25rem' }}>
                          <span>Click to view {notif.type.includes('task') ? 'task' : 'project'}</span>
                          <ChevronRight size={11} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
