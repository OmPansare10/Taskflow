import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Clock, TrendingUp, Users, PieChart } from 'lucide-react';
import { api } from '../api';

export default function AnalyticsView({ projectId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const data = await api.getAnalytics(projectId);
        setStats(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [projectId]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Calculating project metrics...</div>;
  }

  if (!stats) return null;

  const total = stats.totalTasks || 1;
  const statusCounts = stats.statusCounts || {};
  const priorityCounts = stats.priorityCounts || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 4 Metric Cards */}
      <div className="analytics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Overall Completion</span>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <div className="metric-val">{stats.completionRate}%</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {statusCounts.done || 0} of {stats.totalTasks} tasks closed
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Tracked Tasks</span>
            <TrendingUp size={18} color="#6366f1" />
          </div>
          <div className="metric-val">{stats.totalTasks}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Across all workflow stages
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Overdue Deadlines</span>
            <AlertTriangle size={18} color={stats.overdueTasks > 0 ? '#ef4444' : '#10b981'} />
          </div>
          <div className="metric-val" style={{ color: stats.overdueTasks > 0 ? '#dc2626' : 'var(--text-primary)' }}>
            {stats.overdueTasks}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Requires project manager attention
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Effort Logged</span>
            <Clock size={18} color="#06b6d4" />
          </div>
          <div className="metric-val">{stats.totalSpentHours}h</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Estimated total: {stats.totalEstimatedHours}h
          </div>
        </div>
      </div>

      {/* Progress Bars & Distributions */}
      <div className="analytics-sections">
        {/* Workflow Stage Breakdown */}
        <div className="analytics-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} color="#4f46e5" />
            <h3>Workflow Distribution</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="progress-bar-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>To Do</span>
                <span>{statusCounts.todo || 0} ({Math.round(((statusCounts.todo || 0) / total) * 100)}%)</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${((statusCounts.todo || 0) / total) * 100}%`, backgroundColor: '#64748b' }}
                />
              </div>
            </div>

            <div className="progress-bar-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#0284c7' }}>In Progress</span>
                <span>{statusCounts.in_progress || 0} ({Math.round(((statusCounts.in_progress || 0) / total) * 100)}%)</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${((statusCounts.in_progress || 0) / total) * 100}%`, backgroundColor: '#0284c7' }}
                />
              </div>
            </div>

            <div className="progress-bar-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#d97706' }}>Under Review</span>
                <span>{statusCounts.review || 0} ({Math.round(((statusCounts.review || 0) / total) * 100)}%)</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${((statusCounts.review || 0) / total) * 100}%`, backgroundColor: '#d97706' }}
                />
              </div>
            </div>

            <div className="progress-bar-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#059669' }}>Done / Closed</span>
                <span>{statusCounts.done || 0} ({Math.round(((statusCounts.done || 0) / total) * 100)}%)</span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${((statusCounts.done || 0) / total) * 100}%`, backgroundColor: '#059669' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Team Workload */}
        <div className="analytics-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="#4f46e5" />
            <h3>Team Member Workload</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {stats.memberWorkload && stats.memberWorkload.length > 0 ? (
              stats.memberWorkload.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      className="user-avatar"
                      style={{ backgroundColor: m.color || '#6366f1' }}
                    >
                      {m.avatar}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{m.taskCount}</strong> tasks ({m.completedCount} done)
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No workload distribution yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
