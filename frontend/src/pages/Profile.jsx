import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

function useProfileTheme() {
  const [darkMode, setDarkMode] = useState(() =>
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return [darkMode, () => setDarkMode((current) => !current)];
}

function Profile() {

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, toggleTheme] = useProfileTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Developer");
  const [customRole, setCustomRole] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  useEffect(() => {

    if (user) {

      setName(user.name || "");
      setEmail(user.email || "");
      setRole(user.role || "Developer");
      setCustomRole(user.custom_role || "");

    }

  }, [user]);


  const handleSubmit = async (e) => {

    e.preventDefault();

    setMessage("");
    setError("");

    if (!name.trim()) {

      setError("Name cannot be empty");
      return;

    }

    try {

      setSaving(true);

      const token =
        localStorage.getItem("access_token");

      const data = await apiRequest(
        "/auth/profile",
        "PUT",
        {
          name: name.trim(),
          email: email.trim(),
          role,
          custom_role: customRole
        },
        token
      );

      setMessage(
        data.message || "Profile updated successfully"
      );

      /*
       * Update local user information.
       *
       * AuthContext currently does not expose
       * an updateUser function, so we reload the page
       * after successful update.
       */
      setTimeout(() => {
        window.location.reload();
      }, 800);

    } catch (error) {

      setError(
        error.message ||
        "Failed to update profile"
      );

    } finally {

      setSaving(false);

    }

  };


  const handleLogout = () => {

    logout();

    navigate("/login");

  };


  return (

    <div className="app-shell">

      {/* ============================= */}
      {/* SIDEBAR */}
      {/* ============================= */}

      <aside className="sidebar glass">

        <div className="brand">
          TaskFlow
        </div>


        <Link
          to="/profile"
          className="sidebar-user"
        >

          <div className="avatar">
            {user?.name
              ?.charAt(0)
              ?.toUpperCase()}
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


        <nav className="sidebar-nav">

          <Link
            to="/"
            className="nav-item"
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

          <Link
            to="/profile"
            className="nav-item active"
          >
            Profile
          </Link>

        </nav>


        <button
          className="logout-btn"
          onClick={handleLogout}
        >
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


      {/* ============================= */}
      {/* MAIN CONTENT */}
      {/* ============================= */}

      <main className="main-content">

        <div className="page-header">

          <div>

            <p className="eyebrow">
              Account
            </p>

            <h1>
              My Profile
            </h1>

            <p className="page-subtitle">
              Manage your TaskFlow account information.
            </p>

          </div>

        </div>


        {/* ============================= */}
        {/* PROFILE CARD */}
        {/* ============================= */}

        <div className="profile-layout">


          {/* PROFILE SUMMARY */}

          <div className="profile-card glass">

            <div className="profile-avatar-large">

              {user?.name
                ?.charAt(0)
                ?.toUpperCase()}

            </div>


            <h2>
              {user?.name}
            </h2>


            <p>
              {user?.email}
            </p>


            <div className="profile-role">
              {user?.role === "Other"
                ? user?.custom_role || "Other"
                : user?.role || "Developer"}
            </div>

          </div>


          {/* EDIT PROFILE */}

          <div className="profile-card glass">

            <div className="section-heading">

              <div>

                <h2>
                  Edit Profile
                </h2>

                <p>
                  Update your personal information.
                </p>

              </div>

            </div>


            {message && (

              <div className="success-message">
                {message}
              </div>

            )}


            {error && (

              <div className="error-message">
                {error}
              </div>

            )}


            <form onSubmit={handleSubmit}>

              <label>
                Full Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Enter your name"
              />


              <label>
                Role
              </label>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Developer">Developer</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Designer">Designer</option>
                <option value="QA Engineer">QA Engineer</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Other">Other</option>
              </select>

              {role === "Other" && (
                <>
                  <label>
                    Custom Role
                  </label>

                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="e.g. Data Analyst"
                    required
                  />
                </>
              )}


              <label>
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
              />


              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
              >

                {saving
                  ? "Saving..."
                  : "Save Changes"}

              </button>

            </form>

          </div>


        </div>


        {/* ============================= */}
        {/* ACCOUNT INFORMATION */}
        {/* ============================= */}

        <div className="dashboard-card glass">

          <div className="section-heading">

            <div>

              <h2>
                Account Information
              </h2>

              <p>
                Your TaskFlow account details.
              </p>

            </div>

          </div>


          <div className="account-info-grid">

            <div className="account-info-item">

              <span>
                Account Name
              </span>

              <strong>
                {user?.name}
              </strong>

            </div>


            <div className="account-info-item">

              <span>
                Email
              </span>

              <strong>
                {user?.email}
              </strong>

            </div>


            <div className="account-info-item">

              <span>
                Account ID
              </span>

              <strong>
                {user?.id || user?._id}
              </strong>

            </div>

          </div>

        </div>


        {/* ============================= */}
        {/* DANGER ZONE */}
        {/* ============================= */}

        <div className="dashboard-card glass danger-card">

          <div>

            <h2>
              Sign Out
            </h2>

            <p>
              Sign out from your TaskFlow account on this device.
            </p>

          </div>


          <button
            className="danger-btn"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </main>

    </div>

  );

}

export default Profile;
