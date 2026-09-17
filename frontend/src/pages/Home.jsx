import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

function Home() {
  const { user } = useAuth();

  return (
    <div className="home-container">
      {/* ================= HEADER / NAVBAR ================= */}
      <header className="home-nav">
        <Link to="/" className="home-brand">
          <div className="home-brand-icon">⚡</div>
          TaskFlow
        </Link>

        <ul className="home-nav-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#kanban-preview">Kanban Board</a>
          </li>
          <li>
            <a href="#tech-stack">Tech Stack</a>
          </li>
          {user && (
            <li>
              <Link to="/projects">Projects</Link>
            </li>
          )}
        </ul>

        <div className="home-nav-actions">
          {user ? (
            <>
              <Link to="/profile" className="btn-secondary-link">
                👤 {user.name}
              </Link>

              <Link to="/dashboard" className="btn-primary-gradient">
                Go to Dashboard →
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary-link">
                Sign In
              </Link>

              <Link to="/register" className="btn-primary-gradient">
                Get Started Free →
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="hero-section">
        <div className="hero-badge">
          <span>✨</span> Next-Gen Project & Task Management System
        </div>

        <h1 className="hero-title">
          Streamline Projects. Empower Teams. <br />
          <span>Deliver Results Faster.</span>
        </h1>

        <p className="hero-subtitle">
          TaskFlow brings intuitive Kanban workflows, real-time status tracking,
          in-app notification alerts, and team collaboration into one seamless platform.
        </p>

        <div className="hero-actions">
          {user ? (
            <Link to="/dashboard" className="btn-primary-gradient" style={{ padding: "0.9rem 2rem", fontSize: "1.05rem" }}>
              Launch Your Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn-primary-gradient" style={{ padding: "0.9rem 2rem", fontSize: "1.05rem" }}>
                Start Free Account →
              </Link>

              <Link to="/login" className="btn-secondary-link" style={{ padding: "0.9rem 2rem", fontSize: "1.05rem" }}>
                Sign In to Account
              </Link>
            </>
          )}
        </div>

        {/* Interactive Hero Mockup Card */}
        <div className="mockup-container" id="kanban-preview">
          <div className="mockup-header">
            <div className="mockup-dots">
              <span className="mockup-dot dot-red"></span>
              <span className="mockup-dot dot-yellow"></span>
              <span className="mockup-dot dot-green"></span>
            </div>
            <div className="mockup-title">TaskFlow Board — Sprint Alpha</div>
            <div style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>🟢 Live Demo</div>
          </div>

          <div className="mockup-body">
            {/* Column 1 */}
            <div className="mockup-column">
              <div className="column-header">
                <span>To Do</span>
                <span className="badge-count">2</span>
              </div>
              <div className="mockup-card">
                <h4>Setup JWT Refresh Tokens</h4>
                <p>Implement secure token rotation logic in FastAPI authentication router.</p>
                <div className="mockup-card-footer">
                  <span className="priority-tag priority-high">High</span>
                  <div className="user-avatar-mini">A</div>
                </div>
              </div>
              <div className="mockup-card">
                <h4>Design Analytics Dashboard</h4>
                <p>Create visual charts for total tasks and completion percentage.</p>
                <div className="mockup-card-footer">
                  <span className="priority-tag priority-medium">Medium</span>
                  <div className="user-avatar-mini">S</div>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="mockup-column">
              <div className="column-header">
                <span>Assigned</span>
                <span className="badge-count">1</span>
              </div>
              <div className="mockup-card">
                <h4>Optimize MongoDB Queries</h4>
                <p>Add compound indexes for user project lookup and task sorting.</p>
                <div className="mockup-card-footer">
                  <span className="priority-tag priority-high">High</span>
                  <div className="user-avatar-mini">O</div>
                </div>
              </div>
            </div>

            {/* Column 3 */}
            <div className="mockup-column">
              <div className="column-header">
                <span>In Review</span>
                <span className="badge-count">1</span>
              </div>
              <div className="mockup-card">
                <h4>In-App Notification Bell</h4>
                <p>Unread badge counter with instant status update triggers.</p>
                <div className="mockup-card-footer">
                  <span className="priority-tag priority-low">Low</span>
                  <div className="user-avatar-mini">M</div>
                </div>
              </div>
            </div>

            {/* Column 4 */}
            <div className="mockup-column">
              <div className="column-header">
                <span>Completed</span>
                <span className="badge-count">2</span>
              </div>
              <div className="mockup-card" style={{ opacity: 0.85 }}>
                <h4>FastAPI Route Architecture</h4>
                <p>Modular routers for projects, tasks, comments, and users.</p>
                <div className="mockup-card-footer">
                  <span className="priority-tag priority-medium">Medium</span>
                  <div className="user-avatar-mini">D</div>
                </div>
              </div>
              <div className="mockup-card" style={{ opacity: 0.85 }}>
                <h4>Vite & React 18 Migration</h4>
                <p>Migrated frontend build pipeline to Vite with fast HMR.</p>
                <div className="mockup-card-footer">
                  <span className="priority-tag priority-low">Low</span>
                  <div className="user-avatar-mini">P</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section className="features-section" id="features">
        <div className="section-header">
          <div className="section-tag">Powerful Capabilities</div>
          <h2 className="section-title">Everything You Need to Manage Software Teams</h2>
          <p className="section-desc">
            Designed for developers, product managers, and reviewers to stay aligned and eliminate project bottlenecks.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">📋</div>
            <h3>Agile Kanban Boards</h3>
            <p>
              Organize tasks across customized columns: To Do, Assigned, In Review, and Completed.
              Track priority levels from Low to High.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">🔔</div>
            <h3>Real-Time Notifications</h3>
            <p>
              Stay informed with in-app notification alerts whenever tasks are assigned, submitted for code review, or commented on.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">📊</div>
            <h3>Dashboard Analytics</h3>
            <p>
              Gain full visibility into project progress, task status breakdowns, overdue deadlines, and overall completion percentages.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">👥</div>
            <h3>Team Directory & Roles</h3>
            <p>
              Assign team roles (Developer, Reviewer, Designer, QA Engineer, Product Manager) and invite members to specific projects.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">💬</div>
            <h3>Contextual Task Comments</h3>
            <p>
              Discuss technical details directly within task items. Receive instant notifications when teammates leave feedback.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">🔒</div>
            <h3>JWT Security & Permissions</h3>
            <p>
              Secure authentication using encrypted JWT tokens, bcrypt password hashing, and granular project ownership rights.
            </p>
          </div>
        </div>
      </section>

      {/* ================= TECH STACK ================= */}
      <section className="tech-section" id="tech-stack">
        <div className="section-header">
          <div className="section-tag">Built with Modern Tech</div>
          <h2 className="section-title">High Performance Tech Stack</h2>
        </div>

        <div className="tech-grid">
          <div className="tech-badge">⚡ FastAPI (Python 3.10+)</div>
          <div className="tech-badge">⚛️ React 18 + Vite</div>
          <div className="tech-badge">🍃 MongoDB + PyMongo</div>
          <div className="tech-badge">🔑 JWT Authentication</div>
          <div className="tech-badge">🎨 Glassmorphism & Modern CSS</div>
        </div>
      </section>

      {/* ================= CTA BANNER ================= */}
      <section className="cta-banner">
        <h2>Ready to Supercharge Your Team's Productivity?</h2>
        <p>Join TaskFlow today and start organizing your software projects with clarity.</p>

        {user ? (
          <Link to="/dashboard" className="btn-primary-gradient" style={{ padding: "1rem 2.2rem", fontSize: "1.1rem" }}>
            Open Your Dashboard →
          </Link>
        ) : (
          <Link to="/register" className="btn-primary-gradient" style={{ padding: "1rem 2.2rem", fontSize: "1.1rem" }}>
            Create Free Account Now →
          </Link>
        )}
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="home-footer">
        <div className="footer-content">
          <div>
            <strong>TaskFlow</strong> — Modern Project Management System
          </div>

          <div className="status-indicator">
            <span className="status-dot"></span>
            All API Systems Operational
          </div>

          <div>
            © {new Date().getFullYear()} TaskFlow. Built with FastAPI & React.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
