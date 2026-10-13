import React, { useState, useRef } from 'react';
import { User, Mail, Briefcase, Tag } from 'lucide-react';

export default function AssigneeAvatarTooltip({
  assignee,
  teamMembers = [],
  project = null,
  currentUser = null,
  size = 26,
  fontSize = '0.7rem'
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = (e) => {
    if (e) e.stopPropagation();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(true);
  };

  const handleMouseLeave = (e) => {
    if (e) e.stopPropagation();
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 120);
  };

  // Get active logged-in user from prop or localStorage
  let user = currentUser;
  if (!user) {
    try {
      const stored = localStorage.getItem('taskflow_user');
      if (stored) user = JSON.parse(stored);
    } catch {}
  }

  // Resolve matching details from team members or project
  const allMembers = [
    ...(teamMembers || []),
    ...((project && project.teamMembers) || [])
  ];

  const matched = allMembers.find(m => {
    if (!m) return false;
    if (assignee?.id && (m.id === assignee.id || m._id === assignee.id)) return true;
    if (assignee?._id && (m.id === assignee._id || m._id === assignee._id)) return true;
    if (assignee?.email && m.email && m.email.toLowerCase() === assignee.email.toLowerCase()) return true;
    if (assignee?.name && m.name && m.name.toLowerCase() === assignee.name.toLowerCase()) return true;
    return false;
  });

  const rawName = assignee?.name || matched?.name || (typeof assignee === 'string' ? assignee : '') || 'Unassigned';
  const nameParts = rawName.trim().split(/\s+/).filter(Boolean);
  
  const firstName = assignee?.firstName || matched?.firstName || (nameParts.length > 0 ? nameParts[0] : rawName);
  const surname = assignee?.surname || assignee?.lastName || matched?.surname || matched?.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '—');
  const role = assignee?.role || matched?.role || (rawName === 'Unassigned' ? 'Unassigned Pool' : 'Team Member');
  
  let email = assignee?.email || matched?.email || '';
  if (!email && rawName && rawName !== 'Unassigned') {
    const formatted = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '.');
    email = `${formatted}@company.com`;
  } else if (email && !email.includes('@') && email.includes('.')) {
    // If e.g. "darshan.gmail.com", format properly to "darshan@gmail.com"
    const lastDotIndex = email.lastIndexOf('.');
    const secondLastDotIndex = email.lastIndexOf('.', lastDotIndex - 1);
    if (secondLastDotIndex !== -1) {
      email = email.substring(0, secondLastDotIndex) + '@' + email.substring(secondLastDotIndex + 1);
    } else {
      email = email.replace('.', '@');
    }
  }
  if (!email) email = '—';

  // Check if this task is assigned to the current user ("You")
  const isYou = Boolean(
    user && (
      (assignee?.id && (String(assignee.id) === String(user.id || user._id))) ||
      (assignee?._id && (String(assignee._id) === String(user.id || user._id))) ||
      (matched?.id && (String(matched.id) === String(user.id || user._id))) ||
      (matched?._id && (String(matched._id) === String(user.id || user._id))) ||
      (assignee?.email && user.email && assignee.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
      (matched?.email && user.email && matched.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
      (email && user.email && email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
      (rawName && user.name && rawName.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
      (rawName && (user.firstName || user.lastName) && rawName.toLowerCase().trim() === `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase())
    )
  );

  const color = isYou ? '#0284c7' : (assignee?.color || matched?.color || '#6366f1');
  const avatar = isYou ? 'You' : (assignee?.avatar || matched?.avatar || (rawName ? rawName.substring(0, 2).toUpperCase() : 'UN'));

  return (
    <div
      className="assignee-avatar-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <div
        className={`user-avatar ${isYou ? 'user-avatar-you' : ''}`}
        style={{
          backgroundColor: color,
          width: isYou ? 'auto' : `${size}px`,
          minWidth: `${size}px`,
          height: `${size}px`,
          fontSize: isYou ? '0.62rem' : fontSize,
          fontWeight: isYou ? 800 : 700,
          cursor: 'pointer'
        }}
      >
        {avatar}
      </div>

      {showTooltip && (
        <div
          className="assignee-popup-card compact"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="assignee-popup-body">
            <div className="assignee-popup-row">
              <span className="assignee-popup-label">
                <User size={11} className="assignee-popup-icon" />
                <span>NAME</span>
              </span>
              <span className="assignee-popup-value">
                {firstName} {isYou && <span className="you-pill-tag">You</span>}
              </span>
            </div>

            <div className="assignee-popup-row">
              <span className="assignee-popup-label">
                <Tag size={11} className="assignee-popup-icon" />
                <span>SURNAME</span>
              </span>
              <span className="assignee-popup-value">{surname}</span>
            </div>

            <div className="assignee-popup-row">
              <span className="assignee-popup-label">
                <Mail size={11} className="assignee-popup-icon" />
                <span>EMAIL</span>
              </span>
              <span className="assignee-popup-value assignee-popup-email" title={email}>{email}</span>
            </div>

            <div className="assignee-popup-row">
              <span className="assignee-popup-label">
                <Briefcase size={11} className="assignee-popup-icon" />
                <span>ROLE</span>
              </span>
              <span className="assignee-popup-value">{role}</span>
            </div>
          </div>

          {/* Tooltip arrow */}
          <div className="assignee-popup-arrow"></div>
        </div>
      )}
    </div>
  );
}
