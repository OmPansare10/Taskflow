import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

function ProjectTasks() {
  const { id } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);

  // =============================
  // SEARCH & FILTERS
  // =============================

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =============================
  // MODALS
  // =============================

  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedMember, setSelectedMember] = useState("");

  // =============================
  // CREATE TASK FORM
  // =============================

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");

  const [creatingTask, setCreatingTask] = useState(false);
  const [assigningTask, setAssigningTask] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [draggedOverStatus, setDraggedOverStatus] = useState(null);

  const currentUserId = user?.id || user?._id;

  const getToken = () => {
    return localStorage.getItem("access_token");
  };

  // =============================
  // FETCH PROJECT
  // =============================

  const fetchProject = async () => {
    const token = getToken();

    const response = await fetch(
      `${API_URL}/projects/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Failed to load project"
      );
    }

    setProject(data);
  };

  // =============================
  // FETCH TASKS
  // =============================

  const fetchTasks = async () => {
    const token = getToken();

    const response = await fetch(
      `${API_URL}/tasks/project/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Failed to load tasks"
      );
    }

    setTasks(
      Array.isArray(data)
        ? data
        : data.tasks || []
    );
  };

  // =============================
  // FETCH MEMBERS
  // =============================

  const fetchMembers = async () => {
    const token = getToken();

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
      throw new Error(
        data.detail || "Failed to load project members"
      );
    }

    setMembers(
      Array.isArray(data)
        ? data
        : data.members || []
    );
  };

  // =============================
  // LOAD DATA
  // =============================

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          fetchProject(),
          fetchTasks(),
          fetchMembers(),
        ]);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  // =============================
  // CREATE TASK
  // =============================

  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    try {
      setCreatingTask(true);
      setError("");

      const token = getToken();

      const response = await fetch(
        `${API_URL}/tasks/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: id,
            title: title.trim(),
            description: description.trim(),
            priority,
            due_date: dueDate || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to create task"
        );
      }

      setTitle("");
      setDescription("");
      setPriority("Medium");
      setDueDate("");
      setShowModal(false);

      await fetchTasks();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setCreatingTask(false);
    }
  };

  // =============================
  // ASSIGN TASK
  // =============================

  const handleAssignTask = async (e) => {
    e.preventDefault();

    if (!selectedTask || !selectedMember) {
      setError("Please select a team member.");
      return;
    }

    try {
      setAssigningTask(true);
      setError("");

      const token = getToken();

      const response = await fetch(
        `${API_URL}/tasks/${selectedTask._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assigned_to: selectedMember,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to assign task"
        );
      }

      /*
       * After assigning a To Do task,
       * move it to Assigned.
       */
      if (selectedTask.status === "todo") {
        const statusResponse = await fetch(
          `${API_URL}/tasks/${selectedTask._id}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              status: "assigned",
            }),
          }
        );

        const statusData =
          await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(
            statusData.detail ||
              "Task assigned but status could not be changed"
          );
        }
      }

      setShowAssignModal(false);
      setSelectedTask(null);
      setSelectedMember("");

      await fetchTasks();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setAssigningTask(false);
    }
  };

  // =============================
  // CHANGE STATUS
  // =============================

  const handleStatusChange = async (
    taskId,
    nextStatus
  ) => {
    try {
      setChangingStatus(true);
      setError("");

      const token = getToken();

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
          data.detail ||
            "Failed to update task status"
        );
      }

      await fetchTasks();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleTaskDrop = async (nextStatus) => {
    if (!draggedTaskId) {
      return;
    }

    const draggedTask = tasks.find(
      (task) => String(task._id) === String(draggedTaskId)
    );

    setDraggedOverStatus(null);

    if (!draggedTask || draggedTask.status === nextStatus) {
      setDraggedTaskId(null);
      return;
    }

    try {
      setChangingStatus(true);
      setError("");

      const token = getToken();

      // Dropping a task into Assigned claims it for the logged-in developer.
      if (
        nextStatus === "assigned" &&
        String(draggedTask.assigned_to || "") !== String(currentUserId)
      ) {
        const assignResponse = await fetch(
          `${API_URL}/tasks/${draggedTask._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              assigned_to: currentUserId,
            }),
          }
        );

        const assignData = await assignResponse.json();

        if (!assignResponse.ok) {
          throw new Error(
            assignData.detail || "Failed to assign task"
          );
        }
      }

      const response = await fetch(
        `${API_URL}/tasks/${draggedTask._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: nextStatus,
            clear_assignment: nextStatus === "todo",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to move task"
        );
      }

      await fetchTasks();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setChangingStatus(false);
      setDraggedTaskId(null);
    }
  };

  // =============================
  // STATUS LABEL
  // =============================

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

  // =============================
  // MEMBER NAME
  // =============================

  const getMemberName = (userId) => {
    const member = members.find((item) => {
      const memberId =
        item._id ||
        item.id ||
        item.user_id ||
        item;

      return (
        String(memberId) === String(userId)
      );
    });

    return member
      ? member.name ||
          member.email ||
          "Team Member"
      : "Assigned";
  };

  // =============================
  // PROJECT OWNER
  // =============================

  const isProjectOwner = () => {
    if (!project || !currentUserId) {
      return false;
    }

    return (
      String(
        project.owner_id ||
          project.ownerId
      ) === String(currentUserId)
    );
  };

  // =============================
  // ASSIGNED USER
  // =============================

  const isAssignedUser = (task) => {
    if (
      !currentUserId ||
      !task?.assigned_to
    ) {
      return false;
    }

    return (
      String(task.assigned_to) ===
      String(currentUserId)
    );
  };

  // =============================
  // FILTER TASKS
  // =============================

  const filteredTasks = tasks.filter(
    (task) => {
      const search =
        searchTerm
          .toLowerCase()
          .trim();

      const matchesSearch =
        !search ||
        task.title
          ?.toLowerCase()
          .includes(search) ||
        task.description
          ?.toLowerCase()
          .includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      const matchesAssignee =
        assigneeFilter === "all" ||
        String(task.assigned_to) ===
          String(assigneeFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignee
      );
    }
  );

  const recentTasks = [...tasks]
    .sort((firstTask, secondTask) => {
      const firstDate = new Date(
        firstTask.updated_at || firstTask.created_at || 0
      ).getTime();
      const secondDate = new Date(
        secondTask.updated_at || secondTask.created_at || 0
      ).getTime();
      return secondDate - firstDate;
    })
    .slice(0, 5);

  // =============================
  // TASKS BY STATUS
  // =============================

  const getTasksByStatus = (status) => {
    return filteredTasks.filter(
      (task) => task.status === status
    );
  };

  // =============================
  // CLEAR FILTERS
  // =============================

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
  };

  // =============================
  // TASK CARD
  // =============================

  const TaskCard = ({ task }) => (
    <div
      className="task-card"
      draggable={!changingStatus}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task._id);
        setDraggedTaskId(task._id);
      }}
      onDragEnd={() => {
        setDraggedTaskId(null);
        setDraggedOverStatus(null);
      }}
    >

      <div className="task-card-top">

        <span className="task-priority">
          {task.priority || "Medium"}
        </span>

        <span className="task-status">
          {getStatusLabel(task.status)}
        </span>

      </div>


      <Link
        to={`/task/${task._id}`}
        className="task-title-link"
      >
        <h3>{task.title}</h3>
      </Link>


      <p>
        {task.description ||
          "No description"}
      </p>


      <div className="task-card-bottom">

        <span>
          👤{" "}
          {task.assigned_to
            ? getMemberName(
                task.assigned_to
              )
            : "Unassigned"}
        </span>

        {task.due_date && (
          <span>
            📅 {task.due_date}
          </span>
        )}

      </div>


      {/* ASSIGN */}

      {task.status === "todo" &&
        isProjectOwner() && (

          <button
            className="assign-task-button"
            onClick={() => {
              setSelectedTask(task);
              setSelectedMember(
                task.assigned_to || ""
              );
              setShowAssignModal(true);
            }}
          >
            👤 Assign Task
          </button>

        )}


      {/* SEND FOR REVIEW */}

      {task.status === "assigned" &&
        isAssignedUser(task) && (

          <button
            className="status-action-button"
            disabled={changingStatus}
            onClick={() =>
              handleStatusChange(
                task._id,
                "review"
              )
            }
          >
            {changingStatus
              ? "Updating..."
              : "🔍 Send for Review"}
          </button>

        )}


      {/* REVIEW ACTIONS */}

      {task.status === "review" &&
        isProjectOwner() && (

          <div className="review-actions">

            <button
              className="approve-button"
              disabled={changingStatus}
              onClick={() =>
                handleStatusChange(
                  task._id,
                  "completed"
                )
              }
            >
              ✓ Approve
            </button>


            <button
              className="reject-button"
              disabled={changingStatus}
              onClick={() =>
                handleStatusChange(
                  task._id,
                  "assigned"
                )
              }
            >
              ↩ Reject
            </button>

          </div>

        )}


      {/* COMPLETED */}

      {task.status === "completed" && (

        <div className="completed-label">
          ✓ Task Completed
        </div>

      )}

    </div>
  );

  // =============================
  // LOADING
  // =============================

  if (loading) {
    return (
      <div className="project-page-loading">
        <div className="loading-text">
          Loading tasks...
        </div>
      </div>
    );
  }

  // =============================
  // PROJECT NOT FOUND
  // =============================

  if (!project) {
    return (
      <div className="project-page">

        <Link
          to="/projects"
          className="back-link"
        >
          ← Back to Projects
        </Link>

        <div className="auth-error">
          {error || "Project not found"}
        </div>

      </div>
    );
  }

  // =============================
  // MAIN UI
  // =============================

  return (
    <div className="project-page">

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div className="project-top">

        <div>

          <Link
            to={`/project/${id}`}
            className="back-link"
          >
            ← Back to Project
          </Link>


          <div className="project-title-row">

            <div className="large-project-icon">
              {project?.name
                ?.charAt(0)
                .toUpperCase()}
            </div>


            <div>

              <h1>
                {project?.name}
              </h1>

              <p>
                Project Tasks
              </p>

            </div>

          </div>

        </div>


        {isProjectOwner() && (

          <button
            className="primary-button"
            onClick={() =>
              setShowModal(true)
            }
          >
            + Create Task
          </button>

        )}

      </div>


      {/* ============================= */}
      {/* TABS */}
      {/* ============================= */}

      <div className="project-tabs glass">

        <Link
          to={`/project/${id}`}
          className="project-tab"
        >
          Overview
        </Link>

        <Link
          to={`/project/${id}/tasks`}
          className="project-tab active"
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


      {/* ============================= */}
      {/* ERROR */}
      {/* ============================= */}

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}


      {/* ============================= */}
      {/* SEARCH & FILTERS */}
      {/* ============================= */}

      <div className="task-filters glass">

        {/* SEARCH */}

        <div className="task-search">

          <span className="search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(
                e.target.value
              )
            }
          />

        </div>


        {/* STATUS */}

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >

          <option value="all">
            All Status
          </option>

          <option value="todo">
            To Do
          </option>

          <option value="assigned">
            Assigned
          </option>

          <option value="review">
            In Review
          </option>

          <option value="completed">
            Completed
          </option>

        </select>


        {/* PRIORITY */}

        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(
              e.target.value
            )
          }
        >

          <option value="all">
            All Priority
          </option>

          <option value="Low">
            Low
          </option>

          <option value="Medium">
            Medium
          </option>

          <option value="High">
            High
          </option>

        </select>


        {/* ASSIGNEE */}

        <select
          value={assigneeFilter}
          onChange={(e) =>
            setAssigneeFilter(
              e.target.value
            )
          }
        >

          <option value="all">
            All Members
          </option>

          {members.map(
            (member, index) => {

              const memberId =
                member._id ||
                member.id ||
                member.user_id ||
                member;

              const memberName =
                member.name ||
                member.email ||
                `Member ${index + 1}`;

              return (
                <option
                  key={memberId}
                  value={memberId}
                >
                  {memberName}
                </option>
              );
            }
          )}

        </select>


        {/* CLEAR */}

        {(searchTerm ||
          statusFilter !== "all" ||
          priorityFilter !== "all" ||
          assigneeFilter !== "all") && (

          <button
            type="button"
            className="clear-filter-btn"
            onClick={clearFilters}
          >
            Clear
          </button>

        )}

      </div>


      {/* FILTER RESULT */}

      {(searchTerm ||
        statusFilter !== "all" ||
        priorityFilter !== "all" ||
        assigneeFilter !== "all") && (

        <div className="filter-result">
          Showing{" "}
          <strong>
            {filteredTasks.length}
          </strong>{" "}
          of{" "}
          <strong>
            {tasks.length}
          </strong>{" "}
          tasks
        </div>

      )}


      {/* ============================= */}
      {/* KANBAN BOARD */}
      {/* ============================= */}

      <div className="kanban-board">

        {/* TO DO */}

        <div
          className={`kanban-column ${draggedOverStatus === "todo" ? "drop-target" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDraggedOverStatus("todo");
          }}
          onDragLeave={() => setDraggedOverStatus(null)}
          onDrop={(event) => {
            event.preventDefault();
            handleTaskDrop("todo");
          }}
        >

          <div className="kanban-column-header">

            <div>

              <h2>
                To Do
              </h2>

              <span>
                {getTasksByStatus(
                  "todo"
                ).length}
              </span>

            </div>

          </div>


          <div className="kanban-tasks">

            {getTasksByStatus(
              "todo"
            ).length === 0 ? (

              <div className="kanban-empty">
                No tasks
              </div>

            ) : (

              getTasksByStatus(
                "todo"
              ).map((task) => (

                <TaskCard
                  key={task._id}
                  task={task}
                />

              ))

            )}

          </div>

        </div>


        {/* ASSIGNED */}

        <div
          className={`kanban-column ${draggedOverStatus === "assigned" ? "drop-target" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDraggedOverStatus("assigned");
          }}
          onDragLeave={() => setDraggedOverStatus(null)}
          onDrop={(event) => {
            event.preventDefault();
            handleTaskDrop("assigned");
          }}
        >

          <div className="kanban-column-header">

            <div>

              <h2>
                Assigned
              </h2>

              <span>
                {getTasksByStatus(
                  "assigned"
                ).length}
              </span>

            </div>

          </div>


          <div className="kanban-tasks">

            {getTasksByStatus(
              "assigned"
            ).length === 0 ? (

              <div className="kanban-empty">
                No tasks
              </div>

            ) : (

              getTasksByStatus(
                "assigned"
              ).map((task) => (

                <TaskCard
                  key={task._id}
                  task={task}
                />

              ))

            )}

          </div>

        </div>


        {/* IN REVIEW */}

        <div
          className={`kanban-column ${draggedOverStatus === "review" ? "drop-target" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDraggedOverStatus("review");
          }}
          onDragLeave={() => setDraggedOverStatus(null)}
          onDrop={(event) => {
            event.preventDefault();
            handleTaskDrop("review");
          }}
        >

          <div className="kanban-column-header">

            <div>

              <h2>
                In Review
              </h2>

              <span>
                {getTasksByStatus(
                  "review"
                ).length}
              </span>

            </div>

          </div>


          <div className="kanban-tasks">

            {getTasksByStatus(
              "review"
            ).length === 0 ? (

              <div className="kanban-empty">
                No tasks
              </div>

            ) : (

              getTasksByStatus(
                "review"
              ).map((task) => (

                <TaskCard
                  key={task._id}
                  task={task}
                />

              ))

            )}

          </div>

        </div>


        {/* COMPLETED */}

        <div
          className={`kanban-column ${draggedOverStatus === "completed" ? "drop-target" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDraggedOverStatus("completed");
          }}
          onDragLeave={() => setDraggedOverStatus(null)}
          onDrop={(event) => {
            event.preventDefault();
            handleTaskDrop("completed");
          }}
        >

          <div className="kanban-column-header">

            <div>

              <h2>
                Completed
              </h2>

              <span>
                {getTasksByStatus(
                  "completed"
                ).length}
              </span>

            </div>

          </div>


          <div className="kanban-tasks">

            {getTasksByStatus(
              "completed"
            ).length === 0 ? (

              <div className="kanban-empty">
                No tasks
              </div>

            ) : (

              getTasksByStatus(
                "completed"
              ).map((task) => (

                <TaskCard
                  key={task._id}
                  task={task}
                />

              ))

            )}

          </div>

        </div>

      </div>


      {/* ============================= */}
      {/* RECENT TASKS */}
      {/* ============================= */}

      <section className="dashboard-card glass recent-section project-recent-section">

        <div className="section-heading">

          <div>
            <h2>Recent Tasks</h2>
            <p>Recently created or updated tasks in this project</p>
          </div>

        </div>

        {recentTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">+</div>
            <p>No tasks yet.</p>
            <span>Create a task to get started.</span>
          </div>
        ) : (
          <div className="recent-task-list">
            {recentTasks.map((task) => (
              <Link
                key={task._id}
                to={`/task/${task._id}`}
                className="recent-task-row"
              >
                <div className="recent-task-info">
                  <strong>{task.title}</strong>
                  <span>Priority: {task.priority || "Medium"}</span>
                </div>

                <span className={`status-badge status-${task.status}`}>
                  {task.status}
                </span>
              </Link>
            ))}
          </div>
        )}

      </section>


      {/* ============================= */}
      {/* CREATE TASK MODAL */}
      {/* ============================= */}

      {showModal && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowModal(false)
          }
        >

          <div
            className="modal glass"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h2>
              Create New Task
            </h2>

            <p>
              Add a task to this project.
            </p>


            <form
              onSubmit={handleCreateTask}
            >

              <div className="form-group">

                <label>
                  Task Title
                </label>

                <input
                  type="text"
                  placeholder="e.g. Create login page"
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  required
                />

              </div>


              <div className="form-group">

                <label>
                  Description
                </label>

                <textarea
                  placeholder="Describe the task..."
                  rows="4"
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value
                    )
                  }
                />

              </div>


              <div className="form-group">

                <label>
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(
                      e.target.value
                    )
                  }
                >

                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Due Date
                </label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(
                      e.target.value
                    )
                  }
                />

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={creatingTask}
                >
                  {creatingTask
                    ? "Creating..."
                    : "Create Task"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* ============================= */}
      {/* ASSIGN TASK MODAL */}
      {/* ============================= */}

      {showAssignModal && (

        <div
          className="modal-overlay"
          onClick={() => {
            setShowAssignModal(false);
            setSelectedTask(null);
            setSelectedMember("");
          }}
        >

          <div
            className="modal glass"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h2>
              Assign Task
            </h2>

            <p>
              Assign "
              {selectedTask?.title}
              " to a team member.
            </p>


            <form
              onSubmit={handleAssignTask}
            >

              <div className="form-group">

                <label>
                  Team Member
                </label>

                <select
                  value={selectedMember}
                  onChange={(e) =>
                    setSelectedMember(
                      e.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select a member
                  </option>

                  {members.map(
                    (member, index) => {

                      const memberId =
                        member._id ||
                        member.id ||
                        member.user_id ||
                        member;

                      const memberName =
                        member.name ||
                        member.email ||
                        `Member ${index + 1}`;

                      return (
                        <option
                          key={memberId}
                          value={memberId}
                        >
                          {memberName}
                        </option>
                      );
                    }
                  )}

                </select>

              </div>


              {members.length === 0 && (

                <div className="auth-error">
                  No team members are
                  available. Add a member
                  to the project first.
                </div>

              )}


              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedTask(null);
                    setSelectedMember("");
                  }}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    assigningTask ||
                    members.length === 0
                  }
                >
                  {assigningTask
                    ? "Assigning..."
                    : "Assign Task"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default ProjectTasks;