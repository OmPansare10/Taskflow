import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/api";
import "./AdminPortfolio.css";

function AdminPortfolio() {
  const [adminOverview, setAdminOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  const fetchAdminOverview = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiRequest(
        "/dashboard/admin-overview",
        "GET",
        null,
        token
      );
      setAdminOverview(data);
    } catch (err) {
      console.error("Failed to load admin overview:", err);
      setError(err.message || "Failed to load admin portfolio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminOverview();
  }, []);

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
    <div className="portfolio-page">
      {/* ================= PAGE HEADER ================= */}
      <div className="portfolio-header">
        <h1>🏢 Admin Portfolio Overview</h1>
        <p>System-wide visibility across all user-created and managed projects in your workspace.</p>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      {loading ? (
        <div className="loading-text">Loading portfolio data...</div>
      ) : !adminOverview ? (
        <div className="empty-state glass">
          <div className="empty-icon">📁</div>
          <h3>No Portfolio Data Available</h3>
          <p>Create a project to start tracking portfolio performance.</p>
        </div>
      ) : (
        <>
          {/* Portfolio Stats Bar */}
          <div className="portfolio-stats-grid">
            <div className="portfolio-stat-card">
              <div className="portfolio-stat-header">
                <span className="portfolio-lbl">Managed Projects</span>
                <div className="portfolio-icon">🏢</div>
              </div>
              <div className="portfolio-val">{adminOverview.portfolio_projects}</div>
              <div className="portfolio-lbl">Active workspace projects</div>
            </div>

            <div className="portfolio-stat-card">
              <div className="portfolio-stat-header">
                <span className="portfolio-lbl">Portfolio Total Tasks</span>
                <div className="portfolio-icon">📋</div>
              </div>
              <div className="portfolio-val">{adminOverview.portfolio_total_tasks}</div>
              <div className="portfolio-lbl">
                {adminOverview.portfolio_completed_tasks} completed across all projects
              </div>
            </div>

            <div className="portfolio-stat-card">
              <div className="portfolio-stat-header">
                <span className="portfolio-lbl">Average Completion</span>
                <div className="portfolio-icon">📈</div>
              </div>
              <div className="portfolio-val">{adminOverview.average_completion_rate}%</div>
              <div className="progress-bar-track" style={{ marginTop: "0.5rem" }}>
                <div
                  className="progress-bar-fill bar-completed"
                  style={{ width: `${adminOverview.average_completion_rate}%` }}
                ></div>
              </div>
            </div>

            <div className="portfolio-stat-card">
              <div className="portfolio-stat-header">
                <span className="portfolio-lbl">Total Overdue Tasks</span>
                <div className="portfolio-icon" style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}>
                  ⚠️
                </div>
              </div>
              <div
                className="portfolio-val"
                style={{ color: adminOverview.portfolio_overdue_tasks > 0 ? "#ef4444" : "inherit" }}
              >
                {adminOverview.portfolio_overdue_tasks}
              </div>
              <div className="portfolio-lbl">Action items past deadline</div>
            </div>
          </div>

          {/* Portfolio Project Cards Grid */}
          <div className="portfolio-grid">
            {adminOverview.projects?.length === 0 ? (
              <div className="empty-state glass" style={{ gridColumn: "1 / -1" }}>
                <div className="empty-icon">📁</div>
                <h3>No Projects Found</h3>
                <p>Create your first project to view portfolio tracking.</p>
              </div>
            ) : (
              adminOverview.projects?.map((proj) => (
                <div key={proj.id} className="portfolio-card">
                  <div className="portfolio-card-header">
                    <div className="portfolio-card-title">
                      <h3>{proj.name}</h3>
                      <p>{proj.description || "No description provided."}</p>
                    </div>
                    {renderHealthBadge(proj.health_status, proj.health_color)}
                  </div>

                  <div style={{ margin: "1.25rem 0" }}>
                    <div className="progress-item-header">
                      <span>Progress ({proj.completed_tasks}/{proj.total_tasks} tasks)</span>
                      <strong>{proj.completion_percentage}%</strong>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bar-completed"
                        style={{ width: `${proj.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="portfolio-footer">
                    <span>Owner: <strong>{proj.owner_name}</strong></span>
                    <span>Members: <strong>{proj.members_count}</strong></span>
                    <Link
                      to={`/project/${proj.id}`}
                      className="btn-secondary-link"
                      style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}
                    >
                      View Board →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminPortfolio;
