import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = user?.id || user?._id;

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const [creatingProject, setCreatingProject] = useState(false);


  // =====================================================
  // FETCH PROJECTS
  // =====================================================

  const fetchProjectTaskCounts = async (projectList) => {
    const token = localStorage.getItem("access_token");

    const projectTaskCounts = {};

    for (const project of projectList) {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/tasks/project/${project._id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          const tasks = Array.isArray(data) ? data : data.tasks || [];
          projectTaskCounts[project._id] = tasks.length;
        } else {
          projectTaskCounts[project._id] = 0;
        }
      } catch (error) {
        console.error(error);
        projectTaskCounts[project._id] = 0;
      }
    }

    return projectList.map((project) => ({
      ...project,
      task_count: projectTaskCounts[project._id] || 0,
    }));
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");

      const response = await fetch(
        "http://127.0.0.1:8000/projects/",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to load projects"
        );
      }

      const projectsWithTaskCount = await fetchProjectTaskCounts(
        data.projects || []
      );

      setProjects(projectsWithTaskCount);

    } catch (error) {
      console.error(error);
      setError(error.message);

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // LOAD PROJECTS
  // =====================================================

  useEffect(() => {
    fetchProjects();
  }, []);


  // =====================================================
  // CREATE PROJECT
  // =====================================================

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!projectName.trim()) {
      return;
    }

    try {
      setCreatingProject(true);
      setError("");

      const token = localStorage.getItem("access_token");

      const response = await fetch(
        "http://127.0.0.1:8000/projects/",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            name: projectName,
            description: projectDescription,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to create project"
        );
      }

      setProjectName("");
      setProjectDescription("");
      setShowModal(false);

      // Refresh projects
      fetchProjects();

    } catch (error) {
      console.error(error);
      setError(error.message);

    } finally {
      setCreatingProject(false);
    }
  };


  // =====================================================
  // DELETE PROJECT
  // =====================================================

  const isProjectOwner = (project) =>
    String(project.owner_id || project.ownerId || "") === String(currentUserId || "");

  const handleDeleteProject = async (projectId) => {

    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) {
      return;
    }

    try {

      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `http://127.0.0.1:8000/projects/${projectId}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to delete project"
        );
      }

      setProjects((previousProjects) =>
        previousProjects.filter(
          (project) => project._id !== projectId
        )
      );

    } catch (error) {

      console.error(error);
      setError(error.message);

    }
  };

  const handleLeaveProject = async (projectId) => {
    const confirmed = window.confirm(
      "Are you sure you want to leave this project?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `http://127.0.0.1:8000/projects/${projectId}/leave`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to leave project");
      }

      setProjects((previousProjects) =>
        previousProjects.filter((project) => project._id !== projectId)
      );

    } catch (error) {
      console.error(error);
      setError(error.message);
    }
  };


  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="page-container">

      {/* ================= HEADER ================= */}

      <div className="page-header">

        <div>
          <p className="small-text">
            Workspace
          </p>

          <h1>
            Projects
          </h1>

          <p>
            Create and manage your team projects.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowModal(true)}
        >
          + New Project
        </button>

      </div>


      {/* ================= ERROR ================= */}

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}


      {/* ================= LOADING ================= */}

      {loading && (
        <div className="loading-text">
          Loading projects...
        </div>
      )}


      {/* ================= EMPTY ================= */}

      {!loading &&
        !error &&
        projects.length === 0 && (

          <div className="empty-state glass">

            <div className="empty-icon">
              📁
            </div>

            <h3>
              No projects yet
            </h3>

            <p>
              Create your first project to start managing your work.
            </p>

            <button
              className="primary-button"
              onClick={() => setShowModal(true)}
            >
              + Create Project
            </button>

          </div>

        )}


      {/* ================= PROJECT GRID ================= */}

      {!loading &&
        projects.length > 0 && (

          <div className="projects-grid">

            {projects.map((project) => {
              const owner = isProjectOwner(project);

              return (
                <div
                  key={project._id}
                  className="project-card glass project-card-clickable"
                  onClick={() => navigate(`/project/${project._id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/project/${project._id}`);
                    }
                  }}
                >

                  <div className="project-icon">
                    {project.name
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>

                  <h3>
                    {project.name}
                  </h3>

                  <p>
                    {project.description ||
                      "No description available"}
                  </p>

                  <div className="project-info">

                    <span>
                      👥 {project.members?.length || 0} Members
                    </span>

                    <span>
                      📋 {project.task_count || 0} Tasks
                    </span>

                  </div>


                  {/* ================= ACTIONS ================= */}

                  <div className="project-actions">
                    {owner ? (
                      <button
                        type="button"
                        className="delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project._id);
                        }}
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="leave-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeaveProject(project._id);
                        }}
                      >
                        Leave
                      </button>
                    )}
                  </div>

                </div>
              );
            })}

          </div>

        )}


      {/* =====================================================
          CREATE PROJECT MODAL
      ===================================================== */}

      {showModal && (

        <div className="modal-overlay">

          <div className="modal glass project-modal">

            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">New Project</span>
                <h2>
                  Create Project
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                aria-label="Close create project dialog"
                onClick={() => {
                  setShowModal(false);
                  setProjectName("");
                  setProjectDescription("");
                }}
              >
                ×
              </button>
            </div>

            <p>
              Add a name and description for your project.
            </p>


            <form onSubmit={handleCreateProject}>

              <div className="form-group project-form-group">

                <label>
                  Project Name
                </label>

                <input
                  type="text"
                  placeholder="e.g. TaskFlow Website"
                  value={projectName}
                  onChange={(e) =>
                    setProjectName(e.target.value)
                  }
                  required
                />

              </div>


              <div className="form-group project-form-group">

                <label>
                  Description
                </label>

                <textarea
                  placeholder="Describe your project..."
                  value={projectDescription}
                  onChange={(e) =>
                    setProjectDescription(e.target.value)
                  }
                  rows="4"
                />

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowModal(false);
                    setProjectName("");
                    setProjectDescription("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={creatingProject}
                >
                  {creatingProject
                    ? "Creating..."
                    : "Create Project"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Projects;