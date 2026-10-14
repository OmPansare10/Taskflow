import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle, Loader2, Users } from 'lucide-react';
import { api } from '../api';

export default function TeamView({
  teamMembers = [],
  tasks = [],
  projects = [],
  currentUser,
  onRefreshTeam,
  onNavigateToProjects
}) {
  const [searchAccountQuery, setSearchAccountQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [finding, setFinding] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [deletingId, setDeletingId] = useState(null);

  // Handle finding and sending team invitation request
  const handleSendRequest = async (e) => {
    if (e) e.preventDefault();
    const query = searchAccountQuery.trim();
    if (!query) {
      setMessage({ type: 'error', text: 'Please enter an email or employee ID to search.' });
      return;
    }

    setFinding(true);
    setMessage(null);
    try {
      const senderName = currentUser?.firstName
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : (currentUser?.name || currentUser?.email || 'A teammate');

      const res = await api.sendTeamRequest({
        query: query,
        senderEmail: currentUser?.email,
        senderId: currentUser?.id || currentUser?._id,
        senderName: senderName
      });

      setMessage({
        type: 'success',
        text: res.message || `Added ${res.targetUser?.name || query} to your team!`
      });
      setSearchAccountQuery('');
      if (onRefreshTeam) {
        await onRefreshTeam();
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'No registered account found with that email or ID.'
      });
    } finally {
      setFinding(false);
    }
  };

  // Handle removing member from team
  const handleRemoveMember = async (member) => {
    const memberId = member.id || member._id || member.email;
    const displayName = member.name || member.email || 'this member';
    if (!window.confirm(`Are you sure you want to remove ${displayName} from the team?`)) {
      return;
    }

    setDeletingId(memberId);
    try {
      const ownerKey = currentUser?.email || currentUser?.id || currentUser?._id;
      await api.removeTeamMember(memberId, ownerKey);
      if (onRefreshTeam) {
        await onRefreshTeam();
      }
      setMessage({
        type: 'success',
        text: `${displayName} has been removed from the team.`
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to remove member: ' + err.message
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Filter members by local search
  const filteredMembers = teamMembers.filter((m) => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (m.name || '').toLowerCase();
    const email = (m.email || '').toLowerCase();
    const role = (m.role || '').toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary, #f8fafc)',
            margin: 0,
            letterSpacing: '-0.025em'
          }}>
            Team
          </h1>
          <p style={{
            color: 'var(--text-secondary, #94a3b8)',
            fontSize: '0.95rem',
            marginTop: '0.25rem'
          }}>
            Manage your team members
          </p>
        </div>

        {/* View Projects Button */}
        {onNavigateToProjects && (
          <button
            onClick={onNavigateToProjects}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1.35rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            View Projects
          </button>
        )}
      </div>

      {/* Add Registered Member Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0
          }}>
            Add & Invite Teammates
          </h2>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            marginTop: '0.35rem'
          }}>
            Search by registered email or employee ID to add them to your team list.
          </p>
        </div>

        {/* Search & Invite Input Form */}
        <form
          onSubmit={handleSendRequest}
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              placeholder="Enter email or employee ID..."
              value={searchAccountQuery}
              onChange={(e) => setSearchAccountQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                background: '#ffffff',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-strong)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={finding}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#ffffff',
              background: '#4f46e5',
              border: 'none',
              borderRadius: '8px',
              cursor: finding ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              if (!finding) {
                e.currentTarget.style.background = '#4338ca';
              }
            }}
            onMouseOut={(e) => {
              if (!finding) {
                e.currentTarget.style.background = '#4f46e5';
              }
            }}
          >
            {finding ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Adding to Team...</span>
              </>
            ) : (
              <span>Add to Team</span>
            )}
          </button>
        </form>

        {/* Feedback message banner */}
        {message && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: message.type === 'success' ? '#059669' : '#dc2626',
              border: message.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca'
            }}
          >
            {message.type === 'success' ? (
              <CheckCircle size={16} color="#059669" />
            ) : (
              <AlertCircle size={16} color="#dc2626" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Search team filter input */}
      <div style={{ position: 'relative', width: '100%' }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }}
        />
        <input
          type="text"
          placeholder="Search team by name or email..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '0.8rem 1rem 0.8rem 2.75rem',
            fontSize: '0.95rem',
            borderRadius: '12px',
            border: '1px solid var(--border-strong)',
            background: '#ffffff',
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#6366f1';
            e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-strong)';
            e.target.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Team Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1.25rem',
        marginTop: '0.5rem'
      }}>
        {filteredMembers.map((member) => {
          const memberEmail = (member.email || '').toLowerCase();
          const memberName = (member.name || '').toLowerCase();
          const memberId = member.id || member._id || member.userId;

          // Calculate project count
          const projectCount = projects.filter((p) => {
            if (p.manager && p.manager.toLowerCase() === memberName) return true;
            if (p.teamMembers && Array.isArray(p.teamMembers)) {
              return p.teamMembers.some((tm) => {
                const tmEmail = (tm.email || '').toLowerCase();
                const tmName = (tm.name || '').toLowerCase();
                const tmId = tm.id || tm._id;
                return (memberEmail && tmEmail === memberEmail) ||
                       (memberName && tmName === memberName) ||
                       (memberId && tmId === memberId);
              });
            }
            return false;
          }).length;

          // Calculate assigned tasks count
          const taskCount = tasks.filter((t) => {
            if (!t.assignee) return false;
            const aEmail = (t.assignee.email || '').toLowerCase();
            const aName = (t.assignee.name || '').toLowerCase();
            const aId = t.assignee.id || t.assignee._id;
            return (memberEmail && aEmail === memberEmail) ||
                   (memberName && aName === memberName) ||
                   (memberId && aId === memberId);
          }).length;

          // Display initial
          const initial = (member.name || member.email || 'U').charAt(0).toUpperCase();
          const isDeleting = deletingId === (member.id || member._id || member.email);

          return (
            <div
              key={member.id || member._id || member.email}
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '1.75rem 1.25rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                position: 'relative',
                transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.07)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
              }}
            >
              {/* Circular Letter Badge */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#d97706',
                  border: '1px solid #fde68a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem'
                }}
              >
                {initial}
              </div>

              {/* Member Name */}
              <h3 style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 0.25rem',
                lineHeight: 1.3
              }}>
                {member.name || 'Member'}
              </h3>

              {/* Member Email */}
              <div style={{
                fontSize: '0.825rem',
                color: 'var(--text-secondary)',
                wordBreak: 'break-all',
                marginBottom: '0.75rem'
              }}>
                {member.email || 'No email registered'}
              </div>

              {/* Role Badge */}
              <div style={{
                display: 'inline-block',
                background: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.75rem',
                borderRadius: '9999px',
                marginBottom: '1.25rem'
              }}>
                {member.role || 'Developer'}
              </div>

              {/* Stats Row (Projects & Tasks) */}
              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                padding: '0.75rem 0',
                marginBottom: '1.25rem',
                borderTop: '1px solid #f1f5f9',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {projectCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    Projects
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {taskCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    Tasks
                  </div>
                </div>
              </div>

              {/* Remove from team button */}
              <button
                onClick={() => handleRemoveMember(member)}
                disabled={isDeleting}
                style={{
                  width: '100%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  marginTop: 'auto'
                }}
                onMouseOver={(e) => {
                  if (!isDeleting) {
                    e.currentTarget.style.background = '#fecaca';
                    e.currentTarget.style.borderColor = '#f87171';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isDeleting) {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }
                }}
              >
                {isDeleting ? 'Removing...' : 'Remove from team'}
              </button>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px dashed var(--border-subtle)',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Users size={40} color="#6366f1" style={{ opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {filterQuery ? "No members match your search" : "No Team Members Added Yet"}
          </h3>
          <p style={{ maxWidth: '440px', fontSize: '0.875rem', margin: 0 }}>
            {filterQuery
              ? "Try a different search keyword or clear the search filter."
              : "Search for registered accounts using their email or employee ID in the box above, then click 'Find Account' to add them to your team."}
          </p>
        </div>
      )}
    </div>
  );
}
