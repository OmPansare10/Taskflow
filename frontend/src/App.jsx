import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation
} from "react-router-dom";

import { useEffect, useState } from "react";

import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import Project from "./pages/Project";
import ProjectMembers from "./pages/ProjectMembers";
import ProjectTasks from "./pages/ProjectTasks";
import TaskDetails from "./pages/TaskDetails";

import ProtectedRoute from "./component/ProtectedRoute";
import NotificationBell from "./component/NotificationBell";

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

  const isProjectsActive =
    location.pathname === "/projects" ||
    location.pathname.startsWith("/project/");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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
        {children}
      </main>
    </div>
  );
}

function Dashboard() {

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, toggleTheme] = useTheme();

  const [projects, setProjects] = useState([]);
const [tasks, setTasks] = useState([]);

const [analytics, setAnalytics] = useState(null);

const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const [error, setError] = useState("");


  // =========================================================
  // LOAD PROJECTS AND TASKS
  // =========================================================

  const loadDashboard = async () => {

    try {

      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");


      // -----------------------------------------------------
      // GET PROJECTS
      // -----------------------------------------------------

      const projectData = await apiRequest(
        "/projects/",
        "GET",
        null,
        token
      );

      const projectList = Array.isArray(projectData)
        ? projectData
        : projectData.projects || [];

      setProjects(projectList);


      // -----------------------------------------------------
      // GET TASKS FROM EVERY PROJECT
      // -----------------------------------------------------

      let allTasks = [];

      for (const project of projectList) {

        try {

          const taskData = await apiRequest(
            `/tasks/project/${project._id}`,
            "GET",
            null,
            token
          );

          const projectTasks = Array.isArray(taskData)
            ? taskData
            : taskData.tasks || [];

          allTasks = [
            ...allTasks,
            ...projectTasks
          ];

        } catch (taskError) {

          console.log(
            `Could not load tasks for project ${project._id}`
          );

        }

      }

      setTasks(allTasks);

      // -----------------------------------------------------
      // GET DASHBOARD ANALYTICS
      // -----------------------------------------------------

      try {
        const analyticsData = await apiRequest(
          "/dashboard/analytics",
          "GET",
          null,
          token
        );

        setAnalytics(analyticsData);
      } catch (analyticsError) {
        console.error(
          "Could not load dashboard analytics:",
          analyticsError
        );
      }

    } catch (error) {

      console.error(error);

      setError(
        error.message || "Unable to load dashboard"
      );

    } finally {

      setLoading(false);

    }

  };


  useEffect(() => {

    loadDashboard();

  }, []);


  // =========================================================
  // CREATE PROJECT
  // =========================================================

  const handleCreateProject = async (e) => {

    e.preventDefault();

    if (!projectName.trim()) {
      return;
    }

    try {

      const token = localStorage.getItem("access_token");

      await apiRequest(
        "/projects/",
        "POST",
        {
          name: projectName.trim(),
          description: projectDescription.trim()
        },
        token
      );

      setProjectName("");
      setProjectDescription("");

      setShowModal(false);

      await loadDashboard();

    } catch (error) {

      alert(
        error.message || "Failed to create project"
      );

    }

  };


  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {

    logout();

    navigate("/login");

  };


  // =========================================================
  // STATISTICS
  // =========================================================

  const totalProjects = projects.length;

  const totalTasks = tasks.length;

  const reviewTasks = tasks.filter(
    task => task.status === "review"
  ).length;

  const completedTasks = tasks.filter(
    task => task.status === "completed"
  ).length;


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <div className="loading-page">

        <div className="loading-text">
          Loading TaskFlow...
        </div>

      </div>

    );

  }


  // =========================================================
  // DASHBOARD UI
  // =========================================================

  return (

    <div className="app-shell">


      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside className="sidebar glass">

        <div className="brand">
          TaskFlow
        </div>


        {/* USER */}

        <Link to="/profile" className="sidebar-user">

          <div className="avatar">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>

          <div>

            <strong>
              {user?.name}
            </strong>

            <span>
              {user?.email}
            </span>

          </div>

        </Link>


        {/* NAVIGATION */}

        <nav className="sidebar-nav">

          <Link
            to="/"
            className="nav-item active"
          >
            Dashboard
          </Link>


          <Link
            to="/projects"
            className="nav-item"
          >
            Projects
          </Link>


          <Link
            to="/team"
            className="nav-item"
          >
            Team
          </Link>

        </nav>


        {/* LOGOUT */}

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>

      </aside>


      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main className="main-content">


        {/* ===================================================
            HEADER
            =================================================== */}

        <div className="page-header">

          <div>

            <p className="eyebrow">
              Welcome back
            </p>

            <h1>
              {user?.name} 👋
            </h1>

            <p className="page-subtitle">
              Here's what's happening with your projects.
            </p>

          </div>


          {/* HEADER ACTIONS */}

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

            <button
              className="primary-btn"
              onClick={() => setShowModal(true)}
            >
              + New Project
            </button>

          </div>

        </div>


        {/* ===================================================
            ERROR
            =================================================== */}

        {error && (

          <div className="error-message glass">
            {error}
          </div>

        )}


        {/* ===================================================
            STATISTICS
            =================================================== */}

        <section className="stats-grid">


          {/* TOTAL PROJECTS */}

          <div className="stat-card glass">

            <span className="stat-label">
              Total Projects
            </span>

            <strong className="stat-number">
              {analytics?.total_projects ?? totalProjects}
            </strong>

            <span className="stat-description">
              Active projects
            </span>

          </div>


          {/* TOTAL TASKS */}

          <div className="stat-card glass">

            <span className="stat-label">
              Total Tasks
            </span>

            <strong className="stat-number">
              {analytics?.total_tasks ?? totalTasks}
            </strong>

            <span className="stat-description">
              Across all projects
            </span>

          </div>


          {/* REVIEW */}

          <div className="stat-card glass">

            <span className="stat-label">
              In Review
            </span>

            <strong className="stat-number">
              {analytics?.review ?? reviewTasks}
            </strong>

            <span className="stat-description">
              Waiting for review
            </span>

          </div>


          {/* COMPLETED */}

          <div className="stat-card glass">

            <span className="stat-label">
              Completed
            </span>

            <strong className="stat-number">
              {analytics?.completed ?? completedTasks}
            </strong>

            <span className="stat-description">
              Finished tasks
            </span>

          </div>


          {/* OVERDUE */}

          <div className="stat-card glass">

            <span className="stat-label">
              Overdue
            </span>

            <strong className="stat-number">
              {analytics?.overdue ?? 0}
            </strong>

            <span className="stat-description">
              Tasks past due date
            </span>

          </div>

        </section>



        {/* ===================================================
            PROJECTS
            =================================================== */}

        <section className="dashboard-card glass">

          <div className="section-heading">

            <div>

              <h2>
                Your Projects
              </h2>

              <p>
                Projects you own or are a member of
              </p>

            </div>

            <Link
              to="/projects"
              className="secondary-btn"
            >
              View All
            </Link>

          </div>


          {projects.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                +
              </div>

              <p>
                No projects yet.
              </p>

              <button
                className="primary-btn"
                onClick={() => setShowModal(true)}
              >
                Create Your First Project
              </button>

            </div>

          ) : (

            <div className="project-grid">

              {projects
                .slice(0, 4)
                .map(project => {

                  const projectTasks =
                    tasks.filter(
                      task =>
                        task.project_id === project._id
                    );


                  const projectCompleted =
                    projectTasks.filter(
                      task =>
                        task.status === "completed"
                    ).length;


                  const projectProgress =
                    projectTasks.length === 0
                      ? 0
                      : Math.round(
                          (projectCompleted /
                            projectTasks.length) *
                          100
                        );


                  return (

                    <Link
                      key={project._id}
                      to={`/project/${project._id}`}
                      className="project-card glass"
                    >

                      <div className="project-card-top">

                        <div className="project-icon">
                          {project.name
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>

                        <span>
                          {projectTasks.length} tasks
                        </span>

                      </div>


                      <h3>
                        {project.name}
                      </h3>


                      <p>
                        {project.description ||
                          "No description provided."}
                      </p>


                      <div className="project-progress">

                        <div className="project-progress-header">

                          <span>
                            Progress
                          </span>

                          <strong>
                            {projectProgress}%
                          </strong>

                        </div>


                        <div className="progress-bar">

                          <div
                            className="progress-fill"
                            style={{
                              width:
                                `${projectProgress}%`
                            }}
                          />

                        </div>

                      </div>

                    </Link>

                  );

                })}

            </div>

          )}

        </section>

      </main>


      {/* =====================================================
          CREATE PROJECT MODAL
          ===================================================== */}

      {showModal && (

        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
        >

          <div
            className="modal glass project-modal"
            onClick={e => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>

                <span className="modal-eyebrow">
                  New Project
                </span>

                <h2>
                  Create Project
                </h2>

              </div>


              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>

            </div>


            <form
              onSubmit={handleCreateProject}
            >

              <div className="form-group project-form-group">
                <label>
                  Project Name
                </label>

                <input
                  type="text"
                  value={projectName}
                  onChange={e =>
                    setProjectName(e.target.value)
                  }
                  placeholder="Enter project name"
                  required
                />
              </div>


              <div className="form-group project-form-group">
                <label>
                  Description
                </label>

                <textarea
                  value={projectDescription}
                  onChange={e =>
                    setProjectDescription(e.target.value)
                  }
                  placeholder="Describe your project"
                  rows="4"
                />
              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="primary-btn"
                >
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
            DASHBOARD
            ================================================= */}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
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

    </BrowserRouter>

  );

}


export default App;