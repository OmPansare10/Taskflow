import React, { useState } from 'react';
import {
  Layers,
  Lock,
  User,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { api } from '../api';

export default function AuthPage({ initialMode = 'login', onAuthSuccess, onGoHome }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Project Manager'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!formData.email.trim() || !formData.password.trim()) {
          throw new Error('Please enter your email and password.');
        }
        const user = await api.login({
          email: formData.email.trim(),
          password: formData.password
        });
        onAuthSuccess(user);
      } else {
        // Sign Up Validation
        if (!formData.firstName.trim()) throw new Error('First name is required.');
        if (!formData.lastName.trim()) throw new Error('Last name is required.');
        if (!formData.email.trim()) throw new Error('Email address is required.');
        if (!formData.email.includes('@') || !formData.email.includes('.')) {
          throw new Error('Please enter a valid email address.');
        }
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        const newUser = await api.register({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role
        });
        onAuthSuccess(newUser);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Demo auto-fill helper
  const handleFillDemo = (type) => {
    if (type === 'om') {
      setFormData({
        firstName: 'Om',
        lastName: 'Pansare',
        email: 'om.pansare10@gmail.com',
        password: '123456',
        role: 'Backend Engineer'
      });
    } else if (type === 'akshay') {
      setFormData({
        firstName: 'Akshay',
        lastName: 'Pansare',
        email: 'akshay@gmail.com',
        password: '123456',
        role: 'Frontend Engineer'
      });
    } else if (type === 'darshan') {
      setFormData({
        firstName: 'Darshan',
        lastName: 'Pansare',
        email: 'darshan@gmail.com',
        password: '123456',
        role: 'Frontend Engineer'
      });
    } else if (type === 'manager') {
      setFormData({
        firstName: 'Alex',
        lastName: 'Mercer',
        email: 'alex.mercer@company.com',
        password: 'password123',
        role: 'Project Manager'
      });
    } else {
      setFormData({
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah.connor@company.com',
        password: 'password123',
        role: 'DevOps Lead'
      });
    }
  };


  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      position: 'relative'
    }}>
      {/* Top Bar with Return to Home */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '2rem' }}>
        <button
          className="btn btn-secondary"
          onClick={onGoHome}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem' }}
        >
          <ArrowLeft size={15} />
          <span>Back to Home</span>
        </button>
      </div>

      <div style={{
        width: '100%',
        maxWidth: isLogin ? '440px' : '520px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem 2.25rem',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        animation: 'modal-fade 0.25s ease-out'
      }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem', textAlign: 'center' }}>
          <div className="brand-icon" style={{ width: '48px', height: '48px' }}>
            <Layers size={26} />
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800 }}>
            {isLogin ? 'Sign in to TaskFlow' : 'Create your account'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {isLogin
              ? 'Enter your email and password to access company projects'
              : 'Join your organization and start collaborating on tasks'}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            color: '#f87171',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* SIGN UP SPECIFIC: FIRST NAME & LAST NAME */}
          {!isLogin && (
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="firstName"
                    className="form-input"
                    placeholder="e.g. Alex"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Last Name *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="lastName"
                    className="form-input"
                    placeholder="e.g. Mercer"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* EMAIL ADDRESS */}
          <div className="form-group">
            <label>{isLogin ? 'Email Address *' : 'Work Email Address *'}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                name="email"
                className="form-input"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* SIGN UP SPECIFIC: ROLE SELECTOR */}
          {!isLogin && (
            <div className="form-group">
              <label>Company Role</label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="Project Manager">Project Manager (Can create projects & manage budget)</option>
                <option value="Backend Engineer">Backend Engineer</option>
                <option value="Frontend Engineer">Frontend Engineer</option>
                <option value="DevOps Lead">DevOps Lead</option>
                <option value="QA Architect">QA Architect</option>
                <option value="UI/UX Designer">UI/UX Designer</option>
              </select>
            </div>
          )}

          {/* PASSWORD */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Password *</label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder={isLogin ? 'Enter your password' : 'Create strong password (min 6 chars)'}
                value={formData.password}
                onChange={handleChange}
                required
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  color: 'var(--text-muted)'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
            disabled={loading}
          >
            <span>{loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Profiles Auto-Fill Pills (Available for both Sign In and Sign Up) */}
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>
            ⚡ QUICK AUTO-FILL ACCOUNTS:
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              onClick={() => handleFillDemo('om')}
            >
              Om Pansare (Backend)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              onClick={() => handleFillDemo('akshay')}
            >
              Akshay Pansare (Frontend)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              onClick={() => handleFillDemo('darshan')}
            >
              Darshan Pansare (Frontend)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              onClick={() => handleFillDemo('manager')}
            >
              Alex (Manager)
            </button>
          </div>
        </div>


        {/* Toggle Login vs Sign Up */}
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          {isLogin ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                style={{ color: '#4f46e5', fontWeight: 600, background: 'transparent' }}
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                style={{ color: '#4f46e5', fontWeight: 600, background: 'transparent' }}
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
