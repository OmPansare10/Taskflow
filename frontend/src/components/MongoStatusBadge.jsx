import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, X, Server } from 'lucide-react';
import { api } from '../api';

export default function MongoStatusBadge() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await api.checkStatus();
      setStatus(data);
    } catch (err) {
      setStatus({
        connected: false,
        mode: 'disconnected',
        message: 'Could not connect to Django backend',
        uri: 'mongodb://localhost:27017',
        database: 'taskflow_db'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = status?.connected === true;

  return (
    <>
      <div
        className={`mongo-badge ${isConnected ? 'live' : 'fallback'}`}
        onClick={() => setShowModal(true)}
        title="Click to view MongoDB connection details"
      >
        <span className={`pulse-dot ${isConnected ? 'green' : 'amber'}`}></span>
        <Database size={14} />
        <span>{isConnected ? 'MongoDB Connected' : 'Mongo Fallback Store'}</span>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Server size={20} color={isConnected ? '#34d399' : '#fbbf24'} />
                <h3>Database Engine Details</h3>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                padding: '1rem',
                borderRadius: '8px',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}>
                {isConnected ? <CheckCircle2 size={20} color="#34d399" /> : <AlertCircle size={20} color="#fbbf24" />}
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>{isConnected ? 'Live MongoDB Server Active' : 'Automatic Local Storage Mode'}</strong>
                  <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                    {status?.message}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Target URI:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{status?.uri || 'mongodb://localhost:27017'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Database:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{status?.database || 'taskflow_db'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Storage Backend:</span>
                  <span style={{ fontWeight: 600, color: isConnected ? '#34d399' : '#fbbf24' }}>
                    {isConnected ? 'PyMongo Live Driver' : 'High-Performance Local JSON Fallback'}
                  </span>
                </div>
              </div>

              {!isConnected && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '0.85rem', borderRadius: '6px' }}>
                  💡 <strong>To connect to your live MongoDB:</strong>
                  <br />
                  Start your local service via terminal <code>mongod</code> or Docker:
                  <pre style={{ margin: '0.4rem 0', padding: '0.4rem', background: '#0b0f19', borderRadius: '4px', color: '#a5b4fc', fontSize: '0.75rem' }}>
                    docker run -d -p 27017:27017 --name taskflow-mongo mongo
                  </pre>
                  Or set your MongoDB Atlas connection string in <code>backend/.env</code>.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={fetchStatus}
                  disabled={loading}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Checking...' : 'Check Connection'}
                </button>
                <button className="btn btn-primary" onClick={() => setShowModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
