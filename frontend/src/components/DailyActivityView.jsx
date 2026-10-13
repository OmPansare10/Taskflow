import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Activity,
  Layers,
  MessageSquare,
  PlusCircle,
  TrendingUp,
  Download,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  List,
  GitCommit,
  CalendarRange
} from 'lucide-react';
import { api } from '../api';

export default function DailyActivityView({ projectId, project, currentUser }) {
  // Date Helpers
  const formatDateToISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayStr = () => formatDateToISO(new Date());

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDateToISO(d);
  };

  const getDaysAgoStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return formatDateToISO(d);
  };

  const [startDate, setStartDate] = useState(getTodayStr);
  const [endDate, setEndDate] = useState(getTodayStr);
  const [activePreset, setActivePreset] = useState('today'); // 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [userFilter, setUserFilter] = useState('');
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({
    totalActions: 0,
    stageMoves: 0,
    tasksCreated: 0,
    commentsAdded: 0,
    uniqueUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'table'

  // Presets Handlers
  const handleSelectToday = () => {
    const today = getTodayStr();
    setStartDate(today);
    setEndDate(today);
    setActivePreset('today');
  };

  const handleSelectYesterday = () => {
    const yest = getYesterdayStr();
    setStartDate(yest);
    setEndDate(yest);
    setActivePreset('yesterday');
  };

  const handleSelectWeek = () => {
    const start = getDaysAgoStr(7);
    const end = getTodayStr();
    setStartDate(start);
    setEndDate(end);
    setActivePreset('week');
  };

  const handleSelectMonth = () => {
    const start = getDaysAgoStr(30);
    const end = getTodayStr();
    setStartDate(start);
    setEndDate(end);
    setActivePreset('month');
  };

  const handleCustomStartChange = (val) => {
    setStartDate(val);
    setActivePreset('custom');
  };

  const handleCustomEndChange = (val) => {
    setEndDate(val);
    setActivePreset('custom');
  };

  // Fetch activities when projectId, startDate, endDate, or userFilter changes
  useEffect(() => {
    if (!projectId) return;
    loadActivities();
  }, [projectId, startDate, endDate, userFilter]);

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDailyActivity(projectId, {
        startDate,
        endDate,
        user: userFilter
      });
      setActivities(data.activities || []);
      setStats(data.stats || {
        totalActions: 0,
        stageMoves: 0,
        tasksCreated: 0,
        commentsAdded: 0,
        uniqueUsers: 0
      });
    } catch (err) {
      console.error('Failed to load daily activities:', err);
      setError(err.message || 'Failed to load activity logs.');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    setExportSuccess(false);
    setError(null);
    try {
      await api.exportDailyActivity(projectId, {
        startDate,
        endDate,
        user: userFilter
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  // Extract unique user names for filter dropdown
  const uniqueMembers = Array.from(new Set(activities.map(a => a.user).filter(Boolean)));

  const getActionBadgeClass = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('status')) return 'badge-status';
    if (act.includes('create')) return 'badge-create';
    if (act.includes('comment')) return 'badge-comment';
    if (act.includes('priority')) return 'badge-priority';
    return 'badge-default';
  };

  const formatStage = (st) => {
    if (!st || st === '-') return null;
    const s = st.toLowerCase().replace(' ', '_');
    if (s.includes('progress')) return 'In Progress';
    if (s.includes('review')) return 'Review';
    if (s.includes('done')) return 'Done';
    if (s.includes('todo') || s.includes('to_do')) return 'To Do';
    return st.charAt(0).toUpperCase() + st.slice(1);
  };

  const isSingleDay = startDate === endDate;
  const periodLabel = isSingleDay
    ? (startDate === getTodayStr() ? `Today (${startDate})` : startDate === getYesterdayStr() ? `Yesterday (${startDate})` : startDate)
    : `${startDate} to ${endDate}`;

  return (
    <div className="daily-activity-view">
      {/* Header Banner */}
      <div className="activity-header-card">
        <div className="activity-header-left">
          <div className="manager-pill">
            <ShieldCheck size={14} />
            <span>Project Manager Exclusive</span>
          </div>
          <h2 className="activity-title">Activity Audit & Excel Export</h2>
          <p className="activity-subtitle">
            Track and export what all team members did across any day or date range in{' '}
            <strong>{project?.title || 'Current Project'}</strong>.
            Selected period: <strong style={{ color: 'var(--text-primary)' }}>{periodLabel}</strong>.
          </p>
        </div>

        <div className="activity-header-right">
          <button
            className={`btn btn-excel ${exporting ? 'exporting' : ''} ${exportSuccess ? 'success' : ''}`}
            onClick={handleExportExcel}
            disabled={exporting}
            id="export-daily-excel-btn"
          >
            {exporting ? (
              <>
                <RefreshCw size={16} className="spinning" />
                <span>Generating Excel...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 size={16} />
                <span>Downloaded .xlsx!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet size={17} />
                <span>Export to Excel (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Control Bar: From & To Date Selector, Quick Presets & Member Filter */}
      <div className="activity-controls-bar">
        {/* Date Range Selection (From Date to To Date) */}
        <div className="control-group date-range-group">
          <div className="date-field-wrap">
            <label className="control-label">
              <Calendar size={13} />
              <span>From:</span>
            </label>
            <input
              type="date"
              className="date-input"
              value={startDate}
              onChange={(e) => handleCustomStartChange(e.target.value)}
              id="activity-start-date"
            />
          </div>

          <div className="date-field-wrap">
            <label className="control-label">
              <span>To:</span>
            </label>
            <input
              type="date"
              className="date-input"
              value={endDate}
              onChange={(e) => handleCustomEndChange(e.target.value)}
              id="activity-end-date"
            />
          </div>

          {/* Quick Date Range Presets */}
          <div className="quick-date-group">
            <button
              type="button"
              className={`quick-date-btn ${activePreset === 'today' ? 'active' : ''}`}
              onClick={handleSelectToday}
              title="Today only"
            >
              Today
            </button>
            <button
              type="button"
              className={`quick-date-btn ${activePreset === 'yesterday' ? 'active' : ''}`}
              onClick={handleSelectYesterday}
              title="Yesterday only"
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`quick-date-btn ${activePreset === 'week' ? 'active' : ''}`}
              onClick={handleSelectWeek}
              title="Past 7 days"
            >
              Last 7 Days (Week)
            </button>
            <button
              type="button"
              className={`quick-date-btn ${activePreset === 'month' ? 'active' : ''}`}
              onClick={handleSelectMonth}
              title="Past 30 days"
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Member Filter */}
        <div className="control-group">
          <label className="control-label">
            <Filter size={14} />
            <span>Team Member:</span>
          </label>
          <select
            className="user-filter-select"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="">All Team Members ({stats.uniqueUsers})</option>
            {uniqueMembers.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="control-group view-toggle-group">
          <button
            className={`view-toggle-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
            title="Timeline View"
          >
            <GitCommit size={15} />
            <span>Timeline</span>
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table View"
          >
            <List size={15} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="activity-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Summary Cards */}
      <div className="activity-kpi-grid">
        <div className="activity-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <Activity size={18} />
          </div>
          <div className="kpi-content">
            <span className="kpi-num">{stats.totalActions}</span>
            <span className="kpi-label">Actions in Period</span>
          </div>
        </div>

        <div className="activity-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <TrendingUp size={18} />
          </div>
          <div className="kpi-content">
            <span className="kpi-num">{stats.stageMoves}</span>
            <span className="kpi-label">Stage Transitions (Moves)</span>
          </div>
        </div>

        <div className="activity-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <PlusCircle size={18} />
          </div>
          <div className="kpi-content">
            <span className="kpi-num">{stats.tasksCreated}</span>
            <span className="kpi-label">New Tasks Created</span>
          </div>
        </div>

        <div className="activity-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
            <MessageSquare size={18} />
          </div>
          <div className="kpi-content">
            <span className="kpi-num">{stats.commentsAdded}</span>
            <span className="kpi-label">Comments Posted</span>
          </div>
        </div>

        <div className="activity-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <User size={18} />
          </div>
          <div className="kpi-content">
            <span className="kpi-num">{stats.uniqueUsers}</span>
            <span className="kpi-label">Active Team Members</span>
          </div>
        </div>
      </div>

      {/* Main Content: Activities List or Table */}
      {loading ? (
        <div className="activity-loading-state">
          <RefreshCw size={24} className="spinning" />
          <p>Loading activity logs for {periodLabel}...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="activity-empty-state">
          <div className="empty-icon-circle">
            <CalendarRange size={32} />
          </div>
          <h3>No activity recorded between {startDate} and {endDate}</h3>
          <p>
            None of the team members moved tasks or recorded updates in this period.
            Try selecting another date range or use the quick buttons below.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleSelectToday}>
              View Today
            </button>
            <button className="btn btn-secondary" onClick={handleSelectYesterday}>
              View Yesterday
            </button>
            <button className="btn btn-secondary" onClick={handleSelectWeek}>
              View Last 7 Days (Week)
            </button>
          </div>
        </div>
      ) : viewMode === 'timeline' ? (
        /* Timeline View */
        <div className="activity-timeline-wrap">
          <div className="timeline-header-meta">
            <span>
              Showing <strong>{activities.length}</strong> actions from <strong>{periodLabel}</strong>
            </span>
            <button className="link-export-btn" onClick={handleExportExcel}>
              <Download size={13} />
              <span>Download Excel File (.xlsx)</span>
            </button>
          </div>

          <div className="activity-timeline">
            {activities.map((item, idx) => {
              const fromName = formatStage(item.fromStatus);
              const toName = formatStage(item.toStatus);
              const isStageMove = item.action === 'status_changed' || item.action === 'status_change';

              return (
                <div key={item.id || idx} className="timeline-item">
                  <div className="timeline-marker">
                    <div className="marker-dot"></div>
                    {idx < activities.length - 1 && <div className="marker-line"></div>}
                  </div>

                  <div className="timeline-content-card">
                    <div className="item-top-row">
                      <div className="item-user-info">
                        <div className="user-initials-badge">
                          {(item.user || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <span className="item-user-name">{item.user}</span>
                          <span className="item-time">
                            <Clock size={11} />
                            {item.formattedDate && `${item.formattedDate} • `}
                            {item.formattedTime || item.timestamp?.substring(11, 16)}
                          </span>
                        </div>
                      </div>

                      <div className="item-action-badges">
                        <span className={`action-pill ${getActionBadgeClass(item.action)}`}>
                          {item.actionLabel || 'Action'}
                        </span>
                        {item.taskKey && item.taskKey !== '-' && (
                          <span className="task-key-pill">{item.taskKey}</span>
                        )}
                      </div>
                    </div>

                    {/* Stage Transition Visual Indicator */}
                    {isStageMove && (fromName || toName) && (
                      <div className="stage-transition-row">
                        {fromName && (
                          <span className="stage-pill from-stage">{fromName}</span>
                        )}
                        <ArrowRight size={14} className="transition-arrow" />
                        {toName && (
                          <span className="stage-pill to-stage">{toName}</span>
                        )}
                      </div>
                    )}

                    {/* Task Title & Details */}
                    <div className="item-details-body">
                      {item.taskTitle && item.taskTitle !== '-' && (
                        <div className="item-task-title">
                          Task: <strong>{item.taskTitle}</strong>
                        </div>
                      )}
                      <p className="item-details-text">{item.details}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="activity-table-card">
          <table className="audit-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th style={{ width: '105px' }}>Date</th>
                <th style={{ width: '95px' }}>Time</th>
                <th style={{ width: '160px' }}>Team Member</th>
                <th style={{ width: '125px' }}>Action</th>
                <th style={{ width: '90px' }}>Task ID</th>
                <th style={{ width: '200px' }}>Task Title</th>
                <th style={{ width: '170px' }}>Stage Change</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((item, idx) => {
                const fromName = formatStage(item.fromStatus);
                const toName = formatStage(item.toStatus);
                const isStageMove = item.action === 'status_changed' || item.action === 'status_change';

                return (
                  <tr key={item.id || idx}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <span className="table-date">
                        {item.date || item.timestamp?.substring(0, 10)}
                      </span>
                    </td>
                    <td>
                      <span className="table-time">
                        {item.formattedTime || item.timestamp?.substring(11, 16)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <div className="table-user-avatar">
                          {(item.user || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.user}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`action-pill ${getActionBadgeClass(item.action)}`}>
                        {item.actionLabel || 'Action'}
                      </span>
                    </td>
                    <td>
                      {item.taskKey && item.taskKey !== '-' ? (
                        <span className="task-key-pill">{item.taskKey}</span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className="table-task-title" title={item.taskTitle}>
                        {item.taskTitle || '-'}
                      </span>
                    </td>
                    <td>
                      {isStageMove && (fromName || toName) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.775rem' }}>
                          <span className="stage-pill from-stage">{fromName || '-'}</span>
                          <ArrowRight size={12} color="#64748b" />
                          <span className="stage-pill to-stage">{toName || '-'}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {item.details}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
