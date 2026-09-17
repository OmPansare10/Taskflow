import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { API_URL } from "../services/api";

function Project() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const showSuccess = toast?.showSuccess || (() => {});
  const showError = toast?.showError || (() => {});
  const currentUserId = user?.id || user?._id;

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProject = async () => {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
      `${API_URL}/projects/${id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load project");
    }

    setProject(data);
  };

  const fetchTasks = async () => {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
      `${API_URL}/tasks/project/${id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load tasks");
    }

    setTasks(Array.isArray(data) ? data : data.tasks || []);
  };

  const fetchMembers = async () => {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
      `${API_URL}/projects/${id}/members`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load project members");
    }

    setMembers(Array.isArray(data) ? data : data.members || []);
  };

  const fetchActivities = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(`${API_URL}/projects/${id}/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const activityList = Array.isArray(data)
          ? data
          : Array.isArray(data?.activities)
          ? data.activities
          : [];
        setActivities(activityList);
      } else {
        setActivities([]);
      }
    } catch {
      setActivities([]);
    }
  };

  const handleExportCSV = () => {
    if (!tasks || tasks.length === 0) {
      showError("No tasks available to export.");
      return;
    }

    const headers = [
      "Task ID",
      "Title",
      "Description",
      "Status",
      "Priority",
      "Assigned To",
      "Due Date",
      "Created At",
    ];
    const rows = tasks.map((t) => [
      `"${t._id || t.id || ""}"`,
      `"${(t.title || "").replace(/"/g, '""')}"`,
      `"${(t.description || "").replace(/"/g, '""')}"`,
      `"${t.status || ""}"`,
      `"${t.priority || ""}"`,
      `"${t.assigned_to || "Unassigned"}"`,
      `"${t.due_date || ""}"`,
      `"${t.created_at || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `taskflow_project_${project?.name?.toLowerCase().replace(/\s+/g, "_") || id}_tasks.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Tasks exported to CSV!");
  };

  // =====================================================
  // FETCH PROJECT
  // =====================================================

  useEffect(() => {
    const loadProjectData = async () => {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          fetchProject(),
          fetchTasks(),
          fetchMembers(),
          fetchActivities(),
        ]);
      } catch (error) {
        console.error(error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [id]);


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="project-page-loading">
        <div className="loading-text">
          Loading project...
        </div>
      </div>
    );
  }


  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="project-page">
        <Link
          to="/projects"
          className="back-link"
        >
          ← Back to Projects
        </Link>

        <div className="auth-error">
          {error}
        </div>
      </div>
    );
  }


  // =====================================================
  // PROJECT NOT FOUND
  // =====================================================

  if (!project) {
    return (
      <div className="project-page">

        <Link
          to="/projects"
          className="back-link"
        >
          ← Back to Projects
        </Link>

        <div className="empty-state glass">

          <div className="empty-icon">
            📁
          </div>

          <h3>
            Project not found
          </h3>

          <p>
            This project may have been deleted or you may not have access to it.
          </p>

        </div>

      </div>
    );
  }


  const totalTasks = tasks.length;
  const todoTasks = tasks.filter((task) => task.status === "todo").length;
  const assignedTasks = tasks.filter((task) => task.status === "assigned").length;
  const reviewTasks = tasks.filter((task) => task.status === "review").length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;

  const completionPercentage =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  const myTasks = tasks.filter(
    (task) =>
      String(task.assigned_to || "") === String(currentUserId || "")
  );

  const memberWorkload = members
    .map((member) => {
      const memberId = member.id || member._id || member.user_id;
      const memberTasks = tasks.filter(
        (task) => String(task.assigned_to || "") === String(memberId)
      );

      return {
        ...member,
        total: memberTasks.length,
        todo: memberTasks.filter((task) => task.status === "todo").length,
        assigned: memberTasks.filter((task) => task.status === "assigned").length,
        review: memberTasks.filter((task) => task.status === "review").length,
        completed: memberTasks.filter((task) => task.status === "completed").length,
      };
    })
    .sort((a, b) => b.total - a.total);

  // =====================================================
  // PROJECT UI
  // =====================================================

  return (
    <div className="project-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="project-top">

        <div>

          <Link
            to="/projects"
            className="back-link"
          >
            ← Back to Projects
          </Link>

          <div className="project-title-row">

            <div className="large-project-icon">
              {project.name
                ?.charAt(0)
                .toUpperCase()}
            </div>

            <div>

              <h1>
                {project.name}
              </h1>

              <p>
                {project.description ||
                  "No project description"}
              </p>

            </div>

          </div>

        </div>


        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            className="secondary-button"
            onClick={handleExportCSV}
            style={{ padding: "0.6rem 1rem", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            📥 Export CSV
          </button>

          <button
            className="primary-button"
            onClick={() => navigate(`/project/${id}/tasks?create=true`)}
          >
            + Create Task
          </button>
        </div>

      </div>


      {/* =================================================
          TABS
      ================================================= */}

      <div className="project-tabs glass">

        <Link
          to={`/project/${id}`}
          className="project-tab active"
        >
          Overview
        </Link>

        <Link
          to={`/project/${id}/tasks`}
          className="project-tab"
        >
          Tasks
        </Link>

        <Link
          to={`/project/${id}/members`}
          className="project-tab"
        >
          Team
        </Link>

      </div>


      {/* =================================================
          STATISTICS
      ================================================= */}

      <div className="project-summary-grid">

        <div className="summary-card glass">

          <span>
            Total Tasks
          </span>

          <strong>
            {totalTasks}
          </strong>

        </div>


        <div className="summary-card glass">

          <span>
            To Do
          </span>

          <strong>
            {todoTasks}
          </strong>

        </div>


        <div className="summary-card glass">

          <span>
            In Review
          </span>

          <strong>
            {reviewTasks}
          </strong>

        </div>


        <div className="summary-card glass">

          <span>
            Completed
          </span>

          <strong>
            {completedTasks}
          </strong>

        </div>

      </div>


      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="project-content-grid">


        {/* ================= MEMBER WORKLOAD ================= */}

        <section className="project-panel glass">

          <div className="panel-header">

            <div>

              <h2>
                Member Workload
              </h2>

              <p>
                Tasks assigned to project members
              </p>

            </div>

            <Link
              to={`/project/${id}/tasks`}
              className="secondary-button"
            >
              View Tasks
            </Link>

          </div>


          {memberWorkload.length === 0 ? (
            <div className="empty-panel">

              <div className="empty-icon">
                👥
              </div>

              <h3>
                No members yet
              </h3>

              <p>
                Add members to see their task workload.
              </p>

              <Link
                to={`/project/${id}/members`}
                className="primary-button"
              >
                + Add Member
              </Link>

            </div>
          ) : (
            <div className="member-workload-list">
              {memberWorkload.map((member) => (
                <div
                  key={member.id || member._id || member.email}
                  className="member-workload-item"
                >
                  <div className="member-workload-header">
                    <div className="member-workload-identity">
                      <div className="member-avatar">
                        {(member.name || member.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <strong>{member.name || "Team Member"}</strong>
                        <span>{member.email}</span>
                      </div>
                    </div>
                    <div className="member-workload-total">
                      <strong>{member.total}</strong>
                      <span>Total</span>
                    </div>
                  </div>

                  <div className="member-task-counts">
                    <span>To Do <strong>{member.todo}</strong></span>
                    <span>Assigned <strong>{member.assigned}</strong></span>
                    <span>Review <strong>{member.review}</strong></span>
                    <span>Complete <strong>{member.completed}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>


        {/* ================= TEAM ================= */}

        <section className="project-panel glass">

          <div className="panel-header">

            <div>

              <h2>
                Team
              </h2>

              <p>
                People working on this project
              </p>

            </div>

            <Link
              to={`/project/${id}/members`}
              className="secondary-button"
            >
              Manage
            </Link>

          </div>


          {members.length === 0 ? (
            <div className="team-empty">
              <div className="team-count">👥</div>
              <strong>No members yet</strong>
              <span>Add people to start working together.</span>
            </div>
          ) : (
            <div className="project-member-list">
              {members.map((member) => (
                <div
                  key={member.id || member._id || member.email}
                  className="project-member-item"
                >
                  <div className="member-avatar">
                    {(member.name || member.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <strong>{member.name || "Team Member"}</strong>
                    <span>{member.email}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>

      </div>


      {/* =================================================
          TASK PROGRESS + MY TASKS
      ================================================= */}

      <section className="dashboard-grid project-dashboard-grid">

        {/* TASK PROGRESS */}
        <div className="dashboard-card glass">
          <div className="section-heading">
            <div>
              <h2>Task Progress</h2>
              <p>Overall project completion</p>
            </div>

            <strong className="progress-number">
              {completionPercentage}%
            </strong>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${completionPercentage}%`
              }}
            />
          </div>

          <div className="progress-stats">
            <span>
              To Do: <strong>{todoTasks}</strong>
            </span>

            <span>
              Assigned: <strong>{assignedTasks}</strong>
            </span>

            <span>
              Review: <strong>{reviewTasks}</strong>
            </span>

            <span>
              Completed: <strong>{completedTasks}</strong>
            </span>
          </div>
        </div>

        {/* MY TASKS */}
        <div className="dashboard-card glass">
          <div className="section-heading">
            <div>
              <h2>My Tasks</h2>
              <p>Tasks assigned to you</p>
            </div>

            <strong>
              {myTasks.length}
            </strong>
          </div>

          {myTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <p>No tasks assigned to you.</p>
              <span>Tasks assigned to you in this project will appear here.</span>
            </div>
          ) : (
            <div className="mini-task-list">
              {myTasks.map((task) => (
                <Link
                  key={task._id}
                  to={`/task/${task._id}`}
                  className="mini-task"
                >
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.priority || "Medium"}</span>
                  </div>

                  <span
                    className={`status-badge status-${task.status}`}
                  >
                    {task.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </section>

      {/* =================================================
          PROJECT AUDIT TRAIL / ACTIVITY FEED
      ================================================= */}
      {(() => {
        const safeActivities = Array.isArray(activities) ? activities : [];
        return (
          <section className="project-panel glass" style={{ marginTop: "2rem" }}>
            <div className="panel-header">
              <div>
                <h2>Project Activity & Audit Trail</h2>
                <p>Real-time audit log of changes and status updates</p>
              </div>
              <span className="task-status-pill" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366f1" }}>
                {safeActivities.length} Events Logged
              </span>
            </div>

            {safeActivities.length === 0 ? (
              <div className="empty-state" style={{ padding: "2rem", textAlign: "center" }}>
                <div className="empty-icon">📜</div>
                <p style={{ color: "var(--text-muted)" }}>No activity recorded yet for this project.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                {safeActivities.map((act, index) => (
                  <div
                    key={act.id || index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary, rgba(255,255,255,0.03))",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.08))"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>⚡</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                          {act.title || act.user_name || "Activity Event"}{" "}
                          {act.action && (
                            <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
                              {act.action}
                            </span>
                          )}
                        </div>
                        {(act.description || act.details) && (
                          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            {act.description || act.details}
                          </div>
                        )}
                      </div>
                    </div>

                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {act.timestamp
                        ? new Date(act.timestamp).toLocaleString("en-IN", {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })()}

    </div>
  );
}

export default Project;