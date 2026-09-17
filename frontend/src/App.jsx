import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation
} from "react-router-dom";

import { useEffect, useState } from "react";

import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import Project from "./pages/Project";
import ProjectMembers from "./pages/ProjectMembers";
import ProjectTasks from "./pages/ProjectTasks";
import TaskDetails from "./pages/TaskDetails";
import Analytics from "./pages/Analytics";
import AdminPortfolio from "./pages/AdminPortfolio";

import ProtectedRoute from "./component/ProtectedRoute";
import NotificationBell from "./component/NotificationBell";
import { ToastProvider } from "./context/ToastContext";

import { useAuth } from "./context/AuthContext";
import { apiRequest } from "./services/api";

function useTheme() {
  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return [darkMode, () => setDarkMode((current) => !current)];
}


// =========================================================
// DASHBOARD
// =========================================================

function SidebarLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [darkMode, toggleTheme] = useTheme();

  // Global Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);

  const isProjectsActive =
    location.pathname === "/projects" ||
    location.pathname.startsWith("/project/");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchOverlay(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const token = localStorage.getItem("access_token");
        const data = await apiRequest(
          `/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`,
          "GET",
          null,
          token
        );
        setSearchResults(data);
        setShowSearchOverlay(true);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="app-shell">
      <aside className="sidebar glass">
        <div className="brand">TaskFlow</div>

        <Link to="/profile" className="sidebar-user">
          <div className="avatar">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>

          <div>
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
        </Link>

        <nav className="sidebar-nav">
          <Link
            to="/"
            className={`nav-item ${location.pathname === "/" ? "active" : ""}`}
          >
            Home
          </Link>

          <Link
            to="/dashboard"
            className={`nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
          >
            Dashboard
          </Link>

          <Link
            to="/projects"
            className={`nav-item ${isProjectsActive ? "active" : ""}`}
          >
            Projects
          </Link>

          <Link
            to="/team"
            className={`nav-item ${location.pathname === "/team" ? "active" : ""}`}
          >
            Team
          </Link>

          <Link
            to="/analytics"
            className={`nav-item ${location.pathname === "/analytics" ? "active" : ""}`}
          >
            Analytics
          </Link>

          <Link
            to="/admin-portfolio"
            className={`nav-item ${location.pathname === "/admin-portfolio" ? "active" : ""}`}
          >
            Admin Portfolio
          </Link>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </aside>

      <main className="main-content">
        {/* Global Search Header Bar */}
        <header className="global-header-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", position: "relative" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "450px" }}>
            <input
              type="text"
              placeholder="Search tasks, projects, members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearchOverlay(true)}
              style={{
                width: "100%",
                padding: "0.65rem 1rem 0.65rem 2.5rem",
                borderRadius: "12px",
                border: "1px solid var(--border-color, #e2e8f0)",
                background: "var(--bg-card, #ffffff)",
                color: "var(--text-primary, #0f172a)",
                fontSize: "0.9rem",
                outline: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            />
            <span style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.9rem" }}>
              🔍
            </span>

            {/* Global Search Results Dropdown Overlay */}
            {showSearchOverlay && searchResults && (
              <div
                className="search-results-overlay glass"
                style={{
                  position: "absolute",
                  top: "115%",
                  left: 0,
                  right: 0,
                  zIndex: 200,
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                  maxHeight: "400px",
                  overflowY: "auto",
                  padding: "0.85rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.5rem", marginBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Search Results</span>
                  <button
                    type="button"
                    onClick={() => setShowSearchOverlay(false)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.9rem" }}
                  >
                    ✕
                  </button>
                </div>

                {isSearching ? (
                  <p style={{ padding: "0.75rem", fontSize: "0.85rem", color: "#64748b" }}>Searching...</p>
                ) : (
                  <>
                    {/* Projects */}
                    {searchResults.projects?.length > 0 && (
                      <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#4f46e5", marginBottom: "0.35rem" }}>📁 Projects</div>
                        {searchResults.projects.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              navigate(`/project/${p.id}`);
                              setShowSearchOverlay(false);
                              setSearchQuery("");
                            }}
                            style={{ padding: "0.45rem 0.65rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}
                            className="search-item-hover"
                          >
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tasks */}
                    {searchResults.tasks?.length > 0 && (
                      <div style={{ marginBottom: "0.75rem" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#4f46e5", marginBottom: "0.35rem" }}>☑ Tasks</div>
                        {searchResults.tasks.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              navigate(`/task/${t.id}`);
                              setShowSearchOverlay(false);
                              setSearchQuery("");
                            }}
                            style={{ padding: "0.45rem 0.65rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}
                            className="search-item-hover"
                          >
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{t.title}</span>
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{t.project_name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Members */}
                    {searchResults.members?.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#4f46e5", marginBottom: "0.35rem" }}>👤 Team Members (Read-Only)</div>
                        {searchResults.members.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              navigate(`/team`);
                              setShowSearchOverlay(false);
                              setSearchQuery("");
                            }}
                            style={{ padding: "0.45rem 0.65rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", display: "flex", justifyContent: "space-between" }}
                            className="search-item-hover"
                          >
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>{m.name}</span>
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{m.email}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {!searchResults.projects?.length && !searchResults.tasks?.length && !searchResults.members?.length && (
                      <p style={{ padding: "0.75rem", fontSize: "0.85rem", color: "#64748b", fontStyle: "italic" }}>No matching results found.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [darkMode, toggleTheme] = useTheme();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myWorkFilter, setMyWorkFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("access_token");

      const data = await apiRequest("/dashboard/summary", "GET", null, token);
      setSummary(data);
    } catch (err) {
      console.error("Dashboard summary load error:", err);
      setError(err.message || "Failed to load dashboard summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      const token = localStorage.getItem("access_token");
      await apiRequest(
        "/projects/",
        "POST",
        {
          name: projectName.trim(),
          description: projectDescription.trim(),
        },
        token
      );
      setProjectName("");
      setProjectDescription("");
      setShowModal(false);
      await loadDashboard();
    } catch (err) {
      alert(err.message || "Failed to create project");
    }
  };

  const getFilteredMyWork = () => {
    if (!summary?.my_work) return [];
    if (myWorkFilter === "today") return summary.my_work.filter((t) => t.is_due_today);
    if (myWorkFilter === "upcoming") return summary.my_work.filter((t) => t.is_due_soon);
    if (myWorkFilter === "overdue") return summary.my_work.filter((t) => t.is_overdue);
    return summary.my_work;
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-text">Loading TaskFlow Command Center...</div>
      </div>
    );
  }

  const kpis = summary?.kpis || {
    total_projects: 0,
    total_tasks: 0,
    review: 0,
    completed: 0,
    overdue: 0,
    completion_percentage: 0,
  };

  const attention = summary?.attention_required || {
    overdue_tasks: 0,
    review_tasks: 0,
    unassigned_tasks: 0,
    due_today_tasks: 0,
  };

  const myWorkList = getFilteredMyWork();
  const upcomingDeadlines = summary?.upcoming_deadlines || [];
  const projectsHealth = summary?.projects_health || [];
  const teamWorkload = summary?.team_workload || [];
  const recentActivity = summary?.recent_activity || [];
  const userRole = summary?.user?.role || "Developer";

  return (
    <div className="dashboard-page">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <p className="eyebrow">{userRole} Command Center</p>
          <h1>Welcome back, {user?.name || "Team Member"} 👋</h1>
          <p className="page-subtitle">Real-time workspace performance and actionable priority queue.</p>
        </div>

        <div className="dashboard-actions">
          <NotificationBell />

          <button
            type="button"
            className="theme-header-toggle"
            onClick={toggleTheme}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          <button className="primary-btn" onClick={() => setShowModal(true)}>
            + New Project
          </button>
        </div>
      </div>

      {error && <div className="error-message glass">{error}</div>}

      {/* FEATURE 9: IMPROVED KPI SUMMARY CARDS */}
      <section className="stats-grid">
        <div className="stat-card glass">
          <span className="stat-label">Total Projects</span>
          <strong className="stat-number">{kpis.total_projects}</strong>
          <span className="stat-description">Active workspace projects</span>
        </div>

        <div className="stat-card glass">
          <span className="stat-label">Total Tasks</span>
          <strong className="stat-number">{kpis.total_tasks}</strong>
          <span className="stat-description">Across all projects</span>
        </div>

        <div className="stat-card glass">
          <span className="stat-label">In Review</span>
          <strong className="stat-number">{kpis.review}</strong>
          <span className="stat-description">Tasks waiting for review</span>
        </div>

        <div className="stat-card glass">
          <span className="stat-label">Completed</span>
          <strong className="stat-number">{kpis.completed}</strong>
          <span className="stat-description">{kpis.completion_percentage}% completion rate</span>
        </div>

        <div className="stat-card glass">
          <span className="stat-label">Overdue</span>
          <strong className="stat-number" style={{ color: kpis.overdue > 0 ? "#dc2626" : "inherit" }}>
            {kpis.overdue}
          </strong>
          <span className="stat-description">{kpis.overdue > 0 ? "Needs attention" : "All on schedule"}</span>
        </div>
      </section>

      {/* FEATURE 3: ATTENTION REQUIRED CARD */}
      <section className="dashboard-card glass" style={{ marginTop: "1.5rem", padding: "1.25rem 1.5rem" }}>
        <div className="section-heading" style={{ marginBottom: "1rem" }}>
          <div>
            <h2>⚠️ Attention Required</h2>
            <p>Real-time actionable items that need immediate team focus</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <div
            onClick={() => navigate("/projects")}
            style={{ padding: "1rem", borderRadius: "12px", background: attention.overdue_tasks > 0 ? "#fef2f2" : "#f8fafc", border: "1px solid #fee2e2", cursor: "pointer", transition: "transform 0.15s ease" }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: attention.overdue_tasks > 0 ? "#dc2626" : "#475569" }}>
              {attention.overdue_tasks}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>Overdue Tasks</div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Past due date</span>
          </div>

          <div
            onClick={() => navigate("/projects")}
            style={{ padding: "1rem", borderRadius: "12px", background: attention.review_tasks > 0 ? "#fffbeb" : "#f8fafc", border: "1px solid #fef3c7", cursor: "pointer", transition: "transform 0.15s ease" }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: attention.review_tasks > 0 ? "#d97706" : "#475569" }}>
              {attention.review_tasks}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>Tasks Waiting for Review</div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Awaiting owner approval</span>
          </div>

          <div
            onClick={() => navigate("/projects")}
            style={{ padding: "1rem", borderRadius: "12px", background: "#f0f9ff", border: "1px solid #e0f2fe", cursor: "pointer", transition: "transform 0.15s ease" }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0284c7" }}>
              {attention.unassigned_tasks}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>Unassigned Tasks</div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Needs assignment</span>
          </div>

          <div
            onClick={() => navigate("/projects")}
            style={{ padding: "1rem", borderRadius: "12px", background: "#f5f3ff", border: "1px solid #ede9fe", cursor: "pointer", transition: "transform 0.15s ease" }}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#4f46e5" }}>
              {attention.due_today_tasks}
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#0f172a" }}>Tasks Due Today</div>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Action needed today</span>
          </div>
        </div>
      </section>

      {/* TWO COLUMN WORKSPACE LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
        {/* FEATURE 1: MY WORK */}
        <section className="dashboard-card glass" style={{ padding: "1.25rem 1.5rem" }}>
          <div className="section-heading" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>📌 My Work</h2>
              <p>Tasks assigned specifically to you</p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "0.35rem", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
              {["all", "today", "upcoming", "overdue"].map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setMyWorkFilter(filterKey)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: myWorkFilter === filterKey ? "#ffffff" : "transparent",
                    color: myWorkFilter === filterKey ? "#4f46e5" : "#64748b",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    boxShadow: myWorkFilter === filterKey ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {filterKey}
                </button>
              ))}
            </div>
          </div>

          {myWorkList.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem", textStyle: "italic", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
              <p style={{ fontWeight: 600, color: "#0f172a" }}>You're all caught up</p>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>No tasks are currently assigned to you in this filter.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {myWorkList.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/task/${task.id}`)}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "10px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  className="search-item-hover"
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a" }}>{task.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                      {task.project_name} • <span style={{ fontWeight: 500 }}>{task.status.toUpperCase()}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: task.priority === "High" ? "#fee2e2" : task.priority === "Medium" ? "#fef3c7" : "#d1fae5",
                        color: task.priority === "High" ? "#dc2626" : task.priority === "Medium" ? "#d97706" : "#059669",
                      }}
                    >
                      {task.priority}
                    </span>

                    {task.due_date && (
                      <span style={{ fontSize: "0.75rem", color: task.is_overdue ? "#dc2626" : "#64748b", fontWeight: task.is_overdue ? 700 : 400 }}>
                        {task.is_overdue ? "⚠️ Overdue" : task.is_due_today ? "📅 Today" : task.due_date}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FEATURE 2: UPCOMING DEADLINES */}
        <section className="dashboard-card glass" style={{ padding: "1.25rem 1.5rem" }}>
          <div className="section-heading" style={{ marginBottom: "1rem" }}>
            <div>
              <h2>⏳ Upcoming Deadlines</h2>
              <p>Tasks ordered by nearest due date</p>
            </div>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📅</div>
              <p style={{ fontWeight: 600, color: "#0f172a" }}>No upcoming deadlines</p>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>You're completely on schedule.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {upcomingDeadlines.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/task/${task.id}`)}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "10px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  className="search-item-hover"
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a" }}>{task.title}</div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{task.project_name}</div>
                  </div>

                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: task.is_overdue ? "#fee2e2" : task.is_due_today ? "#fef3c7" : "#e0f2fe",
                      color: task.is_overdue ? "#dc2626" : task.is_due_today ? "#d97706" : "#0284c7",
                    }}
                  >
                    {task.is_overdue ? "Overdue" : task.is_due_today ? "Today" : task.due_date}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* FEATURE 4: PROJECT HEALTH & FEATURE 5: TEAM WORKLOAD */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
        {/* PROJECT HEALTH */}
        <section className="dashboard-card glass" style={{ padding: "1.25rem 1.5rem" }}>
          <div className="section-heading" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>📊 Project Health</h2>
              <p>Transparent progress and health rules across your projects</p>
            </div>

            <Link to="/projects" className="secondary-btn" style={{ fontSize: "0.8rem", padding: "6px 12px" }}>
              All Projects
            </Link>
          </div>

          {projectsHealth.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem", textAlign: "center" }}>
              <p style={{ fontWeight: 600, color: "#0f172a" }}>No projects yet</p>
              <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Create your first project to get started.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {projectsHealth.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/project/${p.id}`)}
                  style={{ padding: "1rem", borderRadius: "12px", background: "#ffffff", border: "1px solid #e2e8f0", cursor: "pointer" }}
                  className="search-item-hover"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <strong style={{ fontSize: "1rem", color: "#0f172a" }}>{p.name}</strong>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: p.health_status === "Delayed" ? "#fee2e2" : p.health_status === "Attention" ? "#fef3c7" : "#d1fae5",
                        color: p.health_status === "Delayed" ? "#dc2626" : p.health_status === "Attention" ? "#d97706" : "#059669",
                      }}
                    >
                      ● {p.health_status}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ flex: 1, height: "8px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${p.completion_percentage}%`,
                          background: "linear-gradient(90deg, #4f46e5, #10b981)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{p.completion_percentage}%</span>
                  </div>

                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "#64748b" }}>
                    <span>Total: <strong>{p.total_tasks}</strong></span>
                    <span>Done: <strong>{p.completed_tasks}</strong></span>
                    <span>Review: <strong>{p.review_tasks}</strong></span>
                    {p.overdue_tasks > 0 && <span style={{ color: "#dc2626", fontWeight: 600 }}>Overdue: {p.overdue_tasks}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* TEAM WORKLOAD SUMMARY & RECENT ACTIVITY */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* FEATURE 5: TEAM WORKLOAD SUMMARY */}
          <section className="dashboard-card glass" style={{ padding: "1.25rem 1.5rem" }}>
            <div className="section-heading" style={{ marginBottom: "1rem" }}>
              <div>
                <h2>👥 Team Workload Summary</h2>
                <p>Active task distribution across project members</p>
              </div>
            </div>

            {teamWorkload.length === 0 ? (
              <div className="empty-state" style={{ padding: "1.5rem", textAlign: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>No team members active.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {teamWorkload.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", gap: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", width: "140px" }}>
                      <div className="avatar" style={{ width: "28px", height: "28px", fontSize: "0.75rem" }}>
                        {m.avatar}
                      </div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.name}
                      </span>
                    </div>

                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ flex: 1, height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, (m.active_tasks / Math.max(1, kpis.total_tasks)) * 100 * 2)}%`,
                            background: "#4f46e5",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4f46e5", whiteSpace: "nowrap" }}>
                        {m.active_tasks} active tasks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* FEATURE 6: RECENT ACTIVITY */}
          <section className="dashboard-card glass" style={{ padding: "1.25rem 1.5rem" }}>
            <div className="section-heading" style={{ marginBottom: "1rem" }}>
              <div>
                <h2>📜 Recent Activity</h2>
                <p>Latest updates across your projects</p>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div className="empty-state" style={{ padding: "1.5rem", textAlign: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>No recent activity yet.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {recentActivity.map((act) => (
                  <div key={act.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem" }}>
                    <span>⚡</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "#0f172a", fontWeight: 500 }}>{act.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* CREATE PROJECT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal glass project-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">New Project</span>
                <h2>Create Project</h2>
              </div>

              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="form-group project-form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>

              <div className="form-group project-form-group">
                <label>Description</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe your project"
                  rows="4"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>

                <button type="submit" className="primary-btn">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// =========================================================
// APP
// =========================================================

function App() {

  return (

    <BrowserRouter>
      <ToastProvider>

      <Routes>


        {/* =================================================
            PUBLIC ROUTES
            ================================================= */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* =================================================
            PROFILE
            ================================================= */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            HOME / LANDING PAGE (DEFAULT PUBLIC)
            ================================================= */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* =================================================
            DASHBOARD
            ================================================= */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <Dashboard />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ANALYTICS & ADMIN OVERVIEW
            ================================================= */}

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <Analytics />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN PORTFOLIO OVERVIEW
            ================================================= */}

        <Route
          path="/admin-portfolio"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <AdminPortfolio />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            PROJECTS
            ================================================= */}

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <Projects />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            TEAM
            ================================================= */}

        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <Team />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            PROJECT DETAILS
            ================================================= */}

        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <Project />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            PROJECT MEMBERS
            ================================================= */}

        <Route
          path="/project/:id/members"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <ProjectMembers />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            PROJECT TASKS
            ================================================= */}

        <Route
          path="/project/:id/tasks"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <ProjectTasks />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />


        {/* =================================================
            TASK DETAILS
            ================================================= */}

        <Route
          path="/task/:taskId"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <TaskDetails />
              </SidebarLayout>
            </ProtectedRoute>
          }
        />

      </Routes>
      </ToastProvider>

    </BrowserRouter>

  );

}


export default App;