import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserPlus, X, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api, invalidateApiCache } from '../api';

export default function ProjectMembersSection({
  project,
  teamMembers = [],
  currentUser,
  onUpdateProject
}) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [searchEmailQuery, setSearchEmailQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [fetchedTeamMembers, setFetchedTeamMembers] = useState([]);

  // Load team members from backend to ensure all eligible members from the Team section are available
  useEffect(() => {
    let isMounted = true;
    const ownerKey = currentUser?.email || currentUser?.id || currentUser?._id;
    api.getTeam(ownerKey)
      .then(members => {
        if (isMounted && Array.isArray(members) && members.length > 0) {
          setFetchedTeamMembers(members);
        }
      })
      .catch(err => {
        console.warn('Could not fetch team members for project section:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.email, currentUser?.id, project?.id, project?._id]);

  // Combine props teamMembers and fetchedTeamMembers without duplicates
  const allTeamMembers = useMemo(() => {
    const combined = [...teamMembers];
    const seen = new Set(combined.map(m => String(m.id || m._id || m.email || '').toLowerCase()));
    for (const fm of fetchedTeamMembers) {
      const key = String(fm.id || fm._id || fm.email || '').toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(fm);
      }
    }
    return combined;
  }, [teamMembers, fetchedTeamMembers]);

  if (!project) return null;

  // Helper to identify if a member object corresponds to the project manager/creator
  const isManagerMember = (m) => {
    if (!m) return false;
    const mId = String(m.id || m._id || m.userId || '').trim();
    const mEmail = (m.email || '').toLowerCase().trim();
    const mName = (m.name || '').toLowerCase().trim();

    const pOwnerId = String(project.owner_id || project.createdBy || '').trim();
    const pMgrEmail = (project.managerEmail || '').toLowerCase().trim();
    const pMgrName = (project.manager || '').toLowerCase().trim();

    return (pOwnerId && mId && mId === pOwnerId) ||
           (pMgrEmail && mEmail && mEmail === pMgrEmail) ||
           (pMgrName && mName && mName === pMgrName) ||
           (m.role === 'Project Manager');
  };

  const currentMembers = Array.isArray(project.teamMembers) ? project.teamMembers : [];
  // Assigned project team members (excluding the project manager from regular member slots)
  const assignedProjectMembers = currentMembers.filter(m => !isManagerMember(m));

  // Available team members not yet added as assigned members to this project
  const availableTeamMembers = allTeamMembers.filter(tm => {
    if (isManagerMember(tm)) return false;
    const tmEmail = (tm.email || '').toLowerCase().trim();
    const tmName = (tm.name || '').toLowerCase().trim();
    const tmId = String(tm.id || tm._id || '').trim();

    return !assignedProjectMembers.some(m => {
      const mEmail = (m.email || '').toLowerCase().trim();
      const mName = (m.name || '').toLowerCase().trim();
      const mId = String(m.id || m._id || '').trim();
      return (tmEmail && mEmail === tmEmail) ||
             (tmId && mId === tmId) ||
             (tmName && mName === tmName);
    });
  });

  // Handle adding member from dropdown
  const handleAddFromDropdown = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setStatusMessage({ type: 'error', text: 'Please select a team member to add.' });
      return;
    }

    const memberToAdd = allTeamMembers.find(m => String(m.id || m._id || m.email) === selectedMemberId);
    if (!memberToAdd) return;

    await addMemberDocToProject(memberToAdd);
    setSelectedMemberId('');
  };

  // Handle searching registered user by email/ID and adding
  const handleSearchAndAdd = async (e) => {
    e.preventDefault();
    const query = searchEmailQuery.trim();
    if (!query) {
      setStatusMessage({ type: 'error', text: 'Please enter an email or employee ID to search.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      const ownerKey = currentUser?.email || currentUser?.id || currentUser?._id;
      // Find or add to team first
      const foundOrAdded = await api.addTeamMember(query, ownerKey, {
        ownerEmail: currentUser?.email,
        ownerId: currentUser?.id || currentUser?._id
      });
      await addMemberDocToProject(foundOrAdded);
      setSearchEmailQuery('');
    } catch (err) {
      // If already in team, look up in allTeamMembers
      const existingInTeam = allTeamMembers.find(m => 
        (m.email || '').toLowerCase() === query.toLowerCase() ||
        (m.name || '').toLowerCase().includes(query.toLowerCase())
      );
      if (existingInTeam) {
        await addMemberDocToProject(existingInTeam);
        setSearchEmailQuery('');
      } else {
        setStatusMessage({
          type: 'error',
          text: err.message || 'No registered user found with that email or ID.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to commit member addition to project
  const addMemberDocToProject = async (member) => {
    const memberName = member.name || member.email?.split('@')[0] || 'Team Member';
    const memberEmail = member.email || '';
    const memberId = String(member.id || member._id || member.userId || `m-${Date.now()}`);

    // Verify not already in project
    const alreadyExists = assignedProjectMembers.some(m => 
      (m.email && m.email.toLowerCase() === memberEmail.toLowerCase()) ||
      (m.id && String(m.id) === memberId) ||
      (m.name && m.name.toLowerCase() === memberName.toLowerCase())
    );

    if (alreadyExists) {
      setStatusMessage({ type: 'error', text: `${memberName} is already a member of this project.` });
      return;
    }

    const memberDoc = {
      id: memberId,
      _id: memberId,
      name: memberName,
      email: memberEmail,
      role: member.role || 'Developer',
      avatar: member.avatar || memberName.substring(0, 2).toUpperCase(),
      color: member.color || '#06b6d4'
    };

    // Ensure manager is preserved in project.teamMembers
    const existingManager = currentMembers.find(isManagerMember);
    const updatedMembers = existingManager
      ? [existingManager, ...assignedProjectMembers, memberDoc]
      : [...assignedProjectMembers, memberDoc];

    const projId = project.id || project._id;
    try {
      setLoading(true);
      const updatedProj = await api.updateProject(projId, { teamMembers: updatedMembers });
      invalidateApiCache();
      if (onUpdateProject) {
        onUpdateProject(updatedProj || { ...project, teamMembers: updatedMembers });
      }
      setStatusMessage({ type: 'success', text: `✓ Added ${memberName} to ${project.title}!` });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to update project: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle removing a member from the project
  const handleRemoveMember = async (member) => {
    const memberName = member.name || member.email || 'this member';
    if (!window.confirm(`Remove ${memberName} from this project?`)) {
      return;
    }

    const memberId = String(member.id || member._id || '');
    const memberEmail = (member.email || '').toLowerCase();
    const updatedMembers = currentMembers.filter(m => {
      const mId = String(m.id || m._id || '');
      const mEmail = (m.email || '').toLowerCase();
      if (memberId && mId === memberId) return false;
      if (memberEmail && mEmail === memberEmail) return false;
      return true;
    });

    const projId = project.id || project._id;
    try {
      setLoading(true);
      const updatedProj = await api.updateProject(projId, { teamMembers: updatedMembers });
      invalidateApiCache();
      if (onUpdateProject) {
        onUpdateProject(updatedProj || { ...project, teamMembers: updatedMembers });
      }
      setStatusMessage({ type: 'success', text: `Removed ${memberName} from the project.` });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to remove member: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '14px',
      padding: '1.25rem 1.5rem',
      margin: '1.25rem 0',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Top Header Row with Title and Add Member Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem'
      }}>
        {/* Left: Title & Member Count Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#eef2ff',
            color: '#4338ca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{
                fontSize: '0.975rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Project Team Members
              </h3>
              <span
                id="project-member-count-badge"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.1rem 0.5rem',
                  borderRadius: '999px',
                  background: '#eef2ff',
                  color: '#4338ca',
                  border: '1px solid #c7d2fe'
                }}
              >
                {assignedProjectMembers.length}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Members who can be assigned tasks and contribute to this project
            </span>
          </div>
        </div>

        {/* Right: Add Member Control Form */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!isSearchMode ? (
            /* Dropdown mode: Loads eligible members from Team section */
            <form onSubmit={handleAddFromDropdown} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select
                id="project-member-select-dropdown"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.85rem',
                  outline: 'none',
                  minWidth: '200px',
                  cursor: 'pointer'
                }}
              >
                <option value="" style={{ background: '#ffffff', color: '#64748b' }}>
                  {availableTeamMembers.length === 0
                    ? (allTeamMembers.length === 0
                        ? 'No team members available. Please add a member to your Team first.'
                        : 'All team members already in project')
                    : (assignedProjectMembers.length === 0
                        ? 'Select team member to assign...'
                        : 'Add more team members...')}
                </option>
                {availableTeamMembers.map(m => (
                  <option key={m.id || m._id || m.email} value={m.id || m._id || m.email} style={{ background: '#ffffff', color: '#0f172a' }}>
                    {m.name} ({m.role || 'Member'})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                id="add-member-btn"
                disabled={!selectedMemberId || loading}
                className="btn btn-primary"
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  opacity: !selectedMemberId || loading ? 0.6 : 1,
                  cursor: !selectedMemberId || loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                <span>Add Member</span>
              </button>

              <button
                type="button"
                id="toggle-find-email-btn"
                onClick={() => { setIsSearchMode(true); setStatusMessage(null); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#4f46e5',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '0 0.35rem'
                }}
                title="Search any registered member by email or employee ID"
              >
                Find by email
              </button>
            </form>
          ) : (
            /* Search by Email/ID mode */
            <form onSubmit={handleSearchAndAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#4f46e5' }} />
                <input
                  type="text"
                  id="search-email-member-input"
                  placeholder="Email or Employee ID..."
                  value={searchEmailQuery}
                  onChange={(e) => setSearchEmailQuery(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    padding: '0.45rem 0.85rem 0.45rem 2rem',
                    fontSize: '0.85rem',
                    outline: 'none',
                    width: '210px'
                  }}
                />
              </div>

              <button
                type="submit"
                id="search-add-member-btn"
                disabled={!searchEmailQuery.trim() || loading}
                className="btn btn-primary"
                style={{
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  opacity: !searchEmailQuery.trim() || loading ? 0.6 : 1
                }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                <span>Add</span>
              </button>

              <button
                type="button"
                onClick={() => { setIsSearchMode(false); setStatusMessage(null); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: '0 0.25rem'
                }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.85rem',
          borderRadius: '8px',
          fontSize: '0.825rem',
          background: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: statusMessage.type === 'success' ? '#059669' : '#dc2626',
          border: statusMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca'
        }}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Assigned Members Grid / Chips */}
      {assignedProjectMembers.length === 0 ? (
        <div
          id="project-members-empty-state"
          style={{
            padding: '1.25rem',
            textAlign: 'center',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px dashed var(--border-subtle)',
            color: 'var(--text-muted)',
            fontSize: '0.85rem'
          }}
        >
          {allTeamMembers.length === 0
            ? "No team members available. Please add a member to your Team first."
            : "No team members assigned to this project yet. Use the dropdown above to add members."}
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.65rem',
          alignItems: 'center'
        }}>
          {assignedProjectMembers.map((member) => {
            const initial = (member.name || member.email || 'M').charAt(0).toUpperCase();

            return (
              <div
                key={member.id || member._id || member.email}
                className="project-member-chip"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.4rem 0.75rem',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  transition: 'background 0.15s ease'
                }}
              >
                {/* Member Avatar */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: member.color || '#6366f1',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  {member.avatar || initial}
                </div>

                {/* Member Name & Role */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    lineHeight: 1.2
                  }}>
                    {member.name || member.email}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.2,
                    fontWeight: 400
                  }}>
                    {member.role || 'Member'}
                  </span>
                </div>

                {/* Remove Member Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member)}
                  disabled={loading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    padding: '0.15rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginLeft: '0.2rem',
                    transition: 'color 0.15s, background 0.15s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = '#dc2626';
                    e.currentTarget.style.background = '#fee2e2';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                  title={`Remove ${member.name} from project`}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
