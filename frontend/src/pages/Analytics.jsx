import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "./Analytics.css";

function Analytics() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectAnalytics, setProjectAnalytics] = useState(null);

  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  // Fetch projects list for dropdown
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await apiRequest("/projects/", "GET", null, token);
      const projectList = Array.isArray(data) ? data : data.projects || [];
      setProjects(projectList);

      if (projectList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectList[0]._id || projectList[0].id);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
      setError("Failed to load projects list");
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch single project analytics
  const fetchProjectAnalytics = async (projectId) => {
    if (!projectId) return;
    try {
      setLoadingAnalytics(true);
      setError("");
      const data = await apiRequest(
        `/dashboard/project-analytics/${projectId}`,
        "GET",
        null,
        token
      );
      setProjectAnalytics(data);
    } catch (err) {
      console.error("Failed to load project analytics:", err);
      setError(err.message || "Failed to load project analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectAnalytics(selectedProjectId);
    }
  }, [selectedProjectId]);

  const renderHealthBadge = (healthStatus, healthColor) => {
    const colorClass = healthColor || "green";
    const icon = colorClass === "red" ? "🔴" : colorClass === "amber" ? "🟡" : "🟢";
    return (
      <span className={`health-badge ${colorClass}`}>
        {icon} {healthStatus || "On Track"}
      </span>
    );
  };

  return (
    <div className="analytics-page">
      {/* ================= PAGE HEADER ================= */}
      <div className="analytics-header">
        <div className="analytics-title">
          <h1>📊 Project Performance Analytics</h1>
          <p>Inspect project metrics, status breakdowns, priority distributions, and team capacity.</p>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      {/* Project Selector Bar */}
      <div className="project-selector-card">
        <div className="project-selector-group">
          <label htmlFor="project-select">Select Project:</label>
          <select
            id="project-select"
            className="project-dropdown"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            disabled={loadingProjects}
          >
            {projects.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {projectAnalytics && (
          <div>
            {renderHealthBadge(
              projectAnalytics.health_status,
              projectAnalytics.health_color
            )}
          </div>
        )}
      </div>

      {loadingAnalytics ? (
        <div className="loading-text">Loading project performance data...</div>
      ) : !projectAnalytics ? (
        <div className="empty-state glass">
          <div className="empty-icon">📁</div>
          <h3>No Project Selected</h3>
          <p>Create a project or select one from the dropdown menu to inspect performance.</p>
        </div>
      ) : (
        <>
          {/* Stat Cards Grid */}
          <div className="analytics-stats-grid">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Completion Rate</span>
                <div className="stat-icon">📈</div>
              </div>
              <div className="stat-value">{projectAnalytics.completion_percentage}%</div>
              <div className="progress-bar-track" style={{ marginTop: "0.5rem" }}>
                <div
                  className="progress-bar-fill bar-completed"
                  style={{ width: `${projectAnalytics.completion_percentage}%` }}
                ></div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Total Tasks</span>
                <div className="stat-icon">📋</div>
              </div>
              <div className="stat-value">{projectAnalytics.total_tasks}</div>
              <div className="stat-label">
                {projectAnalytics.completed} completed, {projectAnalytics.todo + projectAnalytics.assigned + projectAnalytics.review} active
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">Overdue Tasks</span>
                <div className="stat-icon" style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}>
                  ⚠️
                </div>
              </div>
              <div className="stat-value" style={{ color: projectAnalytics.overdue > 0 ? "#ef4444" : "inherit" }}>
                {projectAnalytics.overdue}
              </div>
              <div className="stat-label">Tasks past due date</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-label">7-Day Velocity</span>
                <div className="stat-icon" style={{ borderColor: "rgba(16, 185, 129, 0.3)" }}>
                  🚀
                </div>
              </div>
              <div className="stat-value">{projectAnalytics.velocity_last_7_days}</div>
              <div className="stat-label">Tasks completed this week</div>
            </div>
          </div>

          {/* Two Column Layout: Status Breakdown & Priority Breakdown */}
          <div className="analytics-two-col">
            {/* Status Distribution */}
            <div className="analytics-panel">
              <div className="panel-title">
                <span>Task Status Breakdown</span>
                <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                  {projectAnalytics.total_tasks} Tasks
                </span>
              </div>

              {projectAnalytics.total_tasks === 0 ? (
                <p className="stat-label">No tasks in this project yet.</p>
              ) : (
                <>
                  <div className="progress-item">
                    <div className="progress-item-header">
                      <span>To Do</span>
                      <span>{projectAnalytics.todo} ({Math.round((projectAnalytics.todo / projectAnalytics.total_tasks) * 100)}%)</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bar-todo"
                        style={{ width: `${(projectAnalytics.todo / projectAnalytics.total_tasks) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="progress-item">
                    <div className="progress-item-header">
                      <span>Assigned</span>
                      <span>{projectAnalytics.assigned} ({Math.round((projectAnalytics.assigned / projectAnalytics.total_tasks) * 100)}%)</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bar-assigned"
                        style={{ width: `${(projectAnalytics.assigned / projectAnalytics.total_tasks) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="progress-item">
                    <div className="progress-item-header">
                      <span>In Review</span>
                      <span>{projectAnalytics.review} ({Math.round((projectAnalytics.review / projectAnalytics.total_tasks) * 100)}%)</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bar-review"
                        style={{ width: `${(projectAnalytics.review / projectAnalytics.total_tasks) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="progress-item">
                    <div className="progress-item-header">
                      <span>Completed</span>
                      <span>{projectAnalytics.completed} ({Math.round((projectAnalytics.completed / projectAnalytics.total_tasks) * 100)}%)</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bar-completed"
                        style={{ width: `${(projectAnalytics.completed / projectAnalytics.total_tasks) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Priority Breakdown */}
            <div className="analytics-panel">
              <div className="panel-title">
                <span>Priority Distribution</span>
                <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                  Jira Severity
                </span>
              </div>

              {projectAnalytics.total_tasks === 0 ? (
                <p className="stat-label">No tasks in this project yet.</p>
              ) : (
                <>
                  <div className="progress-item">
                    <div className="progress-item-header">
                      <span style={{ color: "#ef4444" }}>🔴 High Priority</span>
                      <span>{projectAnalytics.priority?.high || 0}</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bar-high"
                        style={{
                          width: `${((projectAnalytics.priority?.high || 0) / projectAnalytics.total_tasks) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="progress-item">
                    <div className="progress-item-header">
                      <span style={{ color: "#f59e0b" }}>🟡 Medium Priority</span>
                      <span>{projectAnalytics.priority?.medium || 0}</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bar-medium"
                        style={{
                          width: `${((projectAnalytics.priority?.medium || 0) / projectAnalytics.total_tasks) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="progress-item">
                    <div className="progress-item-header">
                      <span style={{ color: "#10b981" }}>🟢 Low Priority</span>
                      <span>{projectAnalytics.priority?.low || 0}</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bar-low"
                        style={{
                          width: `${((projectAnalytics.priority?.low || 0) / projectAnalytics.total_tasks) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Team Workload Breakdown */}
          <div className="analytics-panel">
            <div className="panel-title">
              <span>Team Workload & Capacity Distribution</span>
              <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                {projectAnalytics.team_workload?.length || 0} Team Members
              </span>
            </div>

            {projectAnalytics.team_workload?.length === 0 ? (
              <p className="stat-label">No team members in this project.</p>
            ) : (
              <table className="workload-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                    <th>Workload Share</th>
                  </tr>
                </thead>
                <tbody>
                  {projectAnalytics.team_workload.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-sm">{member.avatar}</div>
                          <div>
                            <strong>{member.name}</strong>
                            <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="priority-tag priority-medium" style={{ fontSize: "0.75rem" }}>
                          {member.role}
                        </span>
                      </td>
                      <td>{member.assigned_tasks} tasks</td>
                      <td>{member.completed_tasks} done</td>
                      <td style={{ width: "25%" }}>
                        <div className="progress-item-header" style={{ marginBottom: "0.25rem" }}>
                          <span>{member.workload_percentage}%</span>
                        </div>
                        <div className="progress-bar-track">
                          <div
                            className="progress-bar-fill bar-assigned"
                            style={{ width: `${member.workload_percentage}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Analytics;
