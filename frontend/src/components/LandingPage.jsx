import React from 'react';
import {
  Layers,
  Kanban,
  Database,
  CheckCircle,
  Users,
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  LogIn,
  UserPlus
} from 'lucide-react';

export default function LandingPage({
  onGoToLogin,
  onGoToSignup,
  onEnterWorkspace,
  currentUser
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Public Top Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(16px)',
        background: 'rgba(255, 255, 255, 0.9)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '1rem 3rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }} onClick={onEnterWorkspace}>
          <div className="brand-icon">
            <Layers size={22} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="brand-name" style={{ fontSize: '1.4rem' }}>TaskFlow</span>
            <span className="brand-badge">Enterprise</span>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Features
          </a>
          <a href="#stack" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Architecture
          </a>
          <a href="#workflow" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Workflows
          </a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {currentUser ? (
            <button className="btn btn-primary" onClick={onEnterWorkspace}>
              <span>Enter Workspace ({currentUser.firstName || currentUser.name})</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={onGoToLogin}
                style={{ fontSize: '0.85rem' }}
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={onGoToSignup}
                style={{ fontSize: '0.85rem' }}
              >
                <UserPlus size={15} />
                <span>Sign Up</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '5rem 2rem 4rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '1000px',
        margin: '0 auto',
        gap: '1.75rem'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.95rem',
          borderRadius: 'var(--radius-full)',
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          color: '#4338ca',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <Sparkles size={14} />
          <span>Next-Generation Enterprise Task Platform</span>
        </div>

        <h1 style={{
          fontSize: '3.4rem',
          fontWeight: 800,
          letterSpacing: '-0.035em',
          lineHeight: 1.15,
          background: 'linear-gradient(135deg, #0f172a 30%, #312e81 70%, #4f46e5 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Manage Company Projects, Tasks & Teams with Precision.
        </h1>

        <p style={{
          fontSize: '1.15rem',
          color: 'var(--text-secondary)',
          maxWidth: '720px',
          lineHeight: 1.6
        }}>
          Empower your Project Managers to create initiatives, orchestrate sprints on dynamic Kanban boards, and track real-time delivery with <strong>React</strong>, <strong>Django REST</strong>, and <strong>MongoDB</strong>.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '0.85rem 1.85rem', fontSize: '1rem' }}
            onClick={onEnterWorkspace}
          >
            <span>Launch Workspace</span>
            <ArrowRight size={18} />
          </button>
          <button
            className="btn btn-secondary"
            style={{ padding: '0.85rem 1.65rem', fontSize: '1rem' }}
            onClick={onGoToSignup}
          >
            <span>Create Account</span>
          </button>
        </div>

        {/* Tech Badges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          marginTop: '1.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Zap size={15} color="#6366f1" />
            <span>React 19 Frontend</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Shield size={15} color="#10b981" />
            <span>Django REST Framework</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Database size={15} color="#38bdf8" />
            <span>MongoDB Database</span>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section id="features" style={{
        padding: '4rem 3rem',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem'
      }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Built for Company Scale & Agility</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Engineered specifically for engineering managers, product leads, and delivery squads.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          <div className="metric-card" style={{ padding: '2rem', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Kanban size={22} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Interactive Kanban Boards</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Drag-and-drop workflow across 4 defined stages: To Do, In Progress, Under Review, and Done. Features quick status advance buttons and priority tags.
            </p>
          </div>

          <div className="metric-card" style={{ padding: '2rem', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
              <Database size={22} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>MongoDB Document Store</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              High-performance PyMongo driver storing rich JSON documents for projects, tasks, comments, and audit histories, with automatic fallback protection.
            </p>
          </div>

          <div className="metric-card" style={{ padding: '2rem', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Users size={22} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Team Directory & Workload</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Monitor team capacity, active task allocations, and individual performance metrics. Easily reassign tasks to avoid bottlenecks.
            </p>
          </div>

          <div className="metric-card" style={{ padding: '2rem', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
              <TrendingUp size={22} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Project Analytics & Metrics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Real-time completion percentage calculations, overdue task alerts, and hours spent vs estimated tracking for accurate milestone delivery.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        marginTop: 'auto',
        background: 'linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.08) 100%)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '4rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 800 }}>Ready to streamline your company projects?</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '550px' }}>
          Sign in or create your company account in under 30 seconds to start creating projects and organizing tasks.
        </p>
        <div style={{ display: 'flex', gap: '0.85rem' }}>
          <button className="btn btn-primary" onClick={onGoToSignup} style={{ padding: '0.75rem 1.75rem' }}>
            <span>Sign Up Now</span>
            <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary" onClick={onGoToLogin} style={{ padding: '0.75rem 1.5rem' }}>
            <span>Sign In</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '1.75rem 3rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={16} color="#818cf8" />
          <span>&copy; {new Date().getFullYear()} TaskFlow Enterprise. React &bull; Django &bull; MongoDB.</span>
        </div>
        <div>All rights reserved.</div>
      </footer>
    </div>
  );
}
