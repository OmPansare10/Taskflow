import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { API_URL } from "../services/api";

function TaskDetails() {
  const { taskId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const showSuccess = toast?.showSuccess || (() => {});
  const showError = toast?.showError || (() => {});
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [comments, setComments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [error, setError] = useState("");

  const [commentText, setCommentText] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  const token = localStorage.getItem("access_token");
  const currentUserId = String(user?.id || user?._id || "");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const fetchTask = async () => {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      headers: authHeaders,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load task");
    }

    setTask(data);
    return data;
  };

  const fetchProject = async (projectId) => {
    if (!projectId) return;

    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      headers: authHeaders,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load project");
    }

    setProject(data);
  };

  const fetchMembers = async (projectId) => {
    if (!projectId) return;

    const response = await fetch(
      `${API_URL}/projects/${projectId}/members`,
      {
        headers: authHeaders,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load project members");
    }

    setMembers(Array.isArray(data) ? data : data.members || []);
  };

  const fetchComments = async () => {
    const response = await fetch(
      `${API_URL}/tasks/${taskId}/comments`,
      {
        headers: authHeaders,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to load comments");
    }

    setComments(Array.isArray(data) ? data : data.comments || []);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const taskData = await fetchTask();

        await Promise.all([
          fetchProject(taskData?.project_id),
          fetchMembers(taskData?.project_id),
          fetchComments(),
        ]);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load task");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [taskId]);

  const getMemberId = (member) =>
    member?._id || member?.id || member?.user_id || member;

  const getMemberName = (userId) => {
    if (!userId) return "Unassigned";

    const member = members.find(
      (item) => String(getMemberId(item)) === String(userId)
    );

    if (member) {
      return member.name || member.email || "Team Member";
    }

    if (
      String(user?.id || user?._id || "") === String(userId)
    ) {
      return user?.name || user?.email || "You";
    }

    return "Team Member";
  };

  const isProjectOwner =
    project &&
    String(project.owner_id || project.ownerId || "") === currentUserId;

  const isAssignedUser =
    task &&
    task.assigned_to &&
    String(task.assigned_to) === currentUserId;

  const getStatusLabel = (status) => {
    switch (status) {
      case "todo":
        return "To Do";
      case "assigned":
        return "Assigned";
      case "review":
        return "In Review";
      case "completed":
        return "Completed";
      default:
        return status || "Unknown";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "todo":
        return "todo";
      case "assigned":
        return "assigned";
      case "review":
        return "review";
      case "completed":
        return "completed";
      default:
        return "";
    }
  };

  const getPriorityClass = (priority) => {
    return String(priority || "Medium").toLowerCase();
  };

  const handleStatusChange = async (nextStatus) => {
    if (!task || actionLoading) return;

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/tasks/${taskId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update task status"
        );
      }

      await fetchTask();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update task");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();

    if (!commentText.trim() || sendingComment) return;

    try {
      setSendingComment(true);
      setError("");

      const response = await fetch(
        `${API_URL}/tasks/${taskId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: commentText.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to add comment"
        );
      }

      setCommentText("");
      await fetchComments();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add comment");
    } finally {
      setSendingComment(false);
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || subtaskLoading) return;

    try {
      setSubtaskLoading(true);
      const res = await fetch(`${API_URL}/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add subtask");
      setNewSubtaskTitle("");
      showSuccess("Subtask added successfully");
      await fetchTask();
    } catch (err) {
      showError(err.message || "Failed to add subtask");
    } finally {
      setSubtaskLoading(false);
    }
  };

  const handleToggleSubtask = async (subtaskId) => {
    try {
      const res = await fetch(
        `${API_URL}/tasks/${taskId}/subtasks/${subtaskId}/toggle`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to toggle subtask");
      await fetchTask();
    } catch (err) {
      showError(err.message || "Failed to toggle subtask");
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      const res = await fetch(
        `${API_URL}/tasks/${taskId}/subtasks/${subtaskId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete subtask");
      showSuccess("Subtask removed");
      await fetchTask();
    } catch (err) {
      showError(err.message || "Failed to delete subtask");
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return String(dateValue);
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitial = (name) => {
    return (
      name?.trim()?.charAt(0)?.toUpperCase() || "U"
    );
  };

  if (loading) {
    return (
      <div className="project-page-loading">
        <div className="loading-text">
          Loading task...
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="project-page">
        <div className="auth-error">
          {error || "Task not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="project-page">
      <div className="task-details-header">
        <div>
          <Link
            to={`/project/${task.project_id}/tasks`}
            className="back-link"
          >
            ← Back to Tasks
          </Link>

          <div className="task-details-title-row">
            <div className="task-details-icon">
              {getInitial(task.title)}
            </div>

            <div>
              <h1>{task.title}</h1>

              <p>
                {project?.name
                  ? `${project.name} • Task Details`
                  : "Task Details"}
              </p>
            </div>
          </div>
        </div>

        <div className="task-details-header-status">
          <span
            className={`task-status-pill ${getStatusClass(
              task.status
            )}`}
          >
            {getStatusLabel(task.status)}
          </span>
        </div>
      </div>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <div className="task-details-layout">
        <div className="task-details-main">
          <div className="task-details-card glass">
            <div className="section-heading">
              <div>
                <h2>Task Information</h2>
                <p>Details and current progress</p>
              </div>
            </div>

            <div className="task-detail-description">
              <h3>Description</h3>

              <p>
                {task.description ||
                  "No description provided."}
              </p>
            </div>

            <div className="task-detail-grid">
              <div className="task-detail-item">
                <span>Priority</span>
                <strong
                  className={`priority-value ${getPriorityClass(
                    task.priority
                  )}`}
                >
                  {task.priority || "Medium"}
                </strong>
              </div>

              <div className="task-detail-item">
                <span>Status</span>
                <strong>
                  {getStatusLabel(task.status)}
                </strong>
              </div>

              <div className="task-detail-item">
                <span>Assigned To</span>
                <strong>
                  {getMemberName(task.assigned_to)}
                </strong>
              </div>

              <div className="task-detail-item">
                <span>Due Date</span>
                <strong>
                  {formatDate(task.due_date)}
                </strong>
              </div>

              <div className="task-detail-item">
                <span>Created</span>
                <strong>
                  {formatDateTime(task.created_at) || "—"}
                </strong>
              </div>

              <div className="task-detail-item">
                <span>Last Updated</span>
                <strong>
                  {formatDateTime(task.updated_at) || "—"}
                </strong>
              </div>
            </div>
          </div>

          <div className="task-details-card glass">
            <div className="section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2>Subtasks & Checklist</h2>
                <p>Break down this task into smaller actionable steps</p>
              </div>
              <span className="task-status-pill" style={{ background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-primary, #6366f1)" }}>
                {(task.subtasks || []).filter((s) => s.completed).length} / {(task.subtasks || []).length} Completed
              </span>
            </div>

            {(task.subtasks || []).length > 0 && (
              <div style={{ margin: "1rem 0 0.5rem 0", height: "6px", background: "var(--bg-tertiary)", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${((task.subtasks || []).filter((s) => s.completed).length / Math.max(1, (task.subtasks || []).length)) * 100}%`,
                    background: "linear-gradient(90deg, #6366f1, #10b981)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
              {(task.subtasks || []).length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
                  No subtasks added yet. Add checklist items below to track progress.
                </p>
              ) : (
                (task.subtasks || []).map((subtask) => (
                  <div
                    key={subtask.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary, rgba(255,255,255,0.05))",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", flex: 1, textDecoration: subtask.completed ? "line-through" : "none", opacity: subtask.completed ? 0.6 : 1 }}>
                      <input
                        type="checkbox"
                        checked={subtask.completed || false}
                        onChange={() => handleToggleSubtask(subtask.id)}
                        style={{ width: "18px", height: "18px", accentColor: "#6366f1", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>{subtask.title}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem", padding: "2px 6px" }}
                      title="Delete subtask"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddSubtask} style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
              <input
                type="text"
                placeholder="Add a new checklist subtask..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
                  background: "var(--bg-tertiary, rgba(0,0,0,0.2))",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                className="primary-button"
                disabled={subtaskLoading || !newSubtaskTitle.trim()}
                style={{ padding: "0.6rem 1.25rem", whiteSpace: "nowrap" }}
              >
                + Add Step
              </button>
            </form>
          </div>

          <div className="task-details-card glass">
            <div className="section-heading">
              <div>
                <h2>Workflow</h2>
                <p>Move this task through the project workflow</p>
              </div>
            </div>

            <div className="workflow-progress">
              {[
                ["todo", "To Do"],
                ["assigned", "Assigned"],
                ["review", "In Review"],
                ["completed", "Completed"],
              ].map(([status, label], index) => {
                const statuses = [
                  "todo",
                  "assigned",
                  "review",
                  "completed",
                ];

                const currentIndex = statuses.indexOf(
                  task.status
                );

                return (
                  <div
                    className={`workflow-step ${
                      index <= currentIndex ? "active" : ""
                    } ${
                      index === currentIndex ? "current" : ""
                    }`}
                    key={status}
                  >
                    <div className="workflow-dot">
                      {index <= currentIndex ? "✓" : index + 1}
                    </div>

                    <span>{label}</span>
                  </div>
                );
              })}
            </div>

            <div className="task-action-buttons">
              {task.status === "assigned" &&
                isAssignedUser && (
                  <button
                    className="primary-button"
                    disabled={actionLoading}
                    onClick={() =>
                      handleStatusChange("review")
                    }
                  >
                    {actionLoading
                      ? "Updating..."
                      : "👀 Submit for Review"}
                  </button>
                )}

              {task.status === "review" &&
                isProjectOwner && (
                  <>
                    <button
                      className="approve-button"
                      disabled={actionLoading}
                      onClick={() =>
                        handleStatusChange("completed")
                      }
                    >
                      {actionLoading
                        ? "Updating..."
                        : "✓ Approve & Complete"}
                    </button>

                    <button
                      className="reject-button"
                      disabled={actionLoading}
                      onClick={() =>
                        handleStatusChange("assigned")
                      }
                    >
                      {actionLoading
                        ? "Updating..."
                        : "↩ Reject & Return"}
                    </button>
                  </>
                )}

              {task.status === "todo" &&
                isProjectOwner && (
                  <Link
                    to={`/project/${task.project_id}/tasks`}
                    className="secondary-button"
                  >
                    Assign Task
                  </Link>
                )}

              {task.status === "completed" && (
                <div className="completed-label">
                  ✓ Task Completed
                </div>
              )}

              {task.status === "assigned" &&
                !isAssignedUser &&
                !isProjectOwner && (
                  <div className="workflow-info">
                    This task is assigned to{" "}
                    <strong>
                      {getMemberName(task.assigned_to)}
                    </strong>
                    .
                  </div>
                )}

              {task.status === "review" &&
                !isProjectOwner && (
                  <div className="workflow-info">
                    This task is waiting for project review.
                  </div>
                )}
            </div>
          </div>
        </div>

        <div className="task-details-sidebar">
          <div className="task-details-card glass">
            <div className="section-heading">
              <div>
                <h2>Project</h2>
                <p>Task workspace</p>
              </div>
            </div>

            {project ? (
              <>
                <div className="project-mini-card">
                  <div className="project-mini-icon">
                    {getInitial(project.name)}
                  </div>

                  <div>
                    <strong>{project.name}</strong>
                    <span>
                      {members.length} team member
                      {members.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/project/${task.project_id}`}
                  className="secondary-button full-width-button"
                >
                  View Project
                </Link>
              </>
            ) : (
              <p className="muted-text">
                Project information unavailable.
              </p>
            )}
          </div>

          <div className="task-details-card glass">
            <div className="section-heading">
              <div>
                <h2>Assignee</h2>
                <p>Current task owner</p>
              </div>
            </div>

            <div className="assignee-card">
              <div className="assignee-avatar">
                {getInitial(
                  getMemberName(task.assigned_to)
                )}
              </div>

              <div>
                <strong>
                  {getMemberName(task.assigned_to)}
                </strong>
                <span>
                  {task.assigned_to
                    ? "Assigned team member"
                    : "No assignee"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="comments-card glass">
          <div className="comments-header">
            <div>
              <h2>Comments</h2>
              <p>Discuss this task with your team</p>
            </div>

            <span>{comments.length}</span>
          </div>

          <div className="comments-list">
            {comments.length === 0 ? (
              <div className="comments-empty">
                <div className="comments-empty-icon">
                  💬
                </div>

                <p>No comments yet.</p>

                <span>
                  Start the conversation about this task.
                </span>
              </div>
            ) : (
              comments.map((comment, index) => {
                const commentName =
                  comment.user_name ||
                  comment.name ||
                  "Team Member";

                return (
                  <div
                    className="comment-item"
                    key={
                      comment._id ||
                      comment.id ||
                      index
                    }
                  >
                    <div className="comment-avatar">
                      {getInitial(commentName)}
                    </div>

                    <div className="comment-content">
                      <div className="comment-top">
                        <strong>{commentName}</strong>

                        {comment.created_at && (
                          <span>
                            {formatDateTime(
                              comment.created_at
                            )}
                          </span>
                        )}
                      </div>

                      <p>{comment.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            className="comment-form"
            onSubmit={handleSendComment}
          >
            <textarea
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) =>
                setCommentText(e.target.value)
              }
              rows="4"
              maxLength={1000}
            />

            <div className="comment-form-bottom">
              <span>
                Comment as{" "}
                <strong>
                  {user?.name || "You"}
                </strong>
              </span>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  sendingComment ||
                  !commentText.trim()
                }
              >
                {sendingComment
                  ? "Sending..."
                  : "Send Comment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TaskDetails;
