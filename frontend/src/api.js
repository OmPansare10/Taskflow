const getApiBase = () => {
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (envBase) {
    const clean = envBase.replace(/\/$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  // Auto-detect local development (localhost / 127.0.0.1) so requests don't hit remote sleeping servers
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '') {
      return '/api';
    }
  }
  return 'https://taskflow-1-y4rn.onrender.com/api';
};

const API_BASE = getApiBase();

// Request deduplication & short-term cache for lightning-fast loads
const inFlightRequests = new Map();
const getCache = new Map();
const CACHE_TTL_MS = 2500; // 2.5s cache for identical GETs

export const invalidateApiCache = () => {
  getCache.clear();
};

async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const url = `${API_BASE}${endpoint}`;

  // Invalidate cache on mutations
  if (method !== 'GET') {
    getCache.clear();
  }

  // Deduplication & cache for GET requests
  const cacheKey = `${method}:${url}`;
  if (method === 'GET') {
    const cached = getCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
  }

  const authHeaders = {};
  try {
    const raw = localStorage.getItem('taskflow_user');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.email) authHeaders['X-User-Email'] = u.email;
      if (u.id || u._id) authHeaders['X-User-Id'] = String(u.id || u._id);
    }
  } catch (e) {}

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    ...options,
  };

  const reqPromise = (async () => {
    try {
      const res = await fetch(url, config);
      if (!res.ok) {
        let errMessage = `Error ${res.status}${res.statusText ? `: ${res.statusText}` : ''}`;
        try {
          const errorJson = await res.json();
          if (errorJson.error) {
            errMessage = errorJson.error;
          } else if (errorJson.detail) {
            errMessage = errorJson.detail;
          } else if (errorJson.message) {
            errMessage = errorJson.message;
          }
        } catch (e) {
          if (res.status === 404) {
            errMessage = `Error 404: Endpoint not found at ${url}. Please verify backend configuration.`;
          } else if (res.status >= 500) {
            errMessage = `Error ${res.status}: Backend server error. The server may be waking up or experiencing issues.`;
          }
        }
        throw new Error(errMessage);
      }
      const data = await res.json();
      if (method === 'GET') {
        getCache.set(cacheKey, { timestamp: Date.now(), data });
      }
      return data;
    } catch (error) {
      console.error(`API Request Failed [${endpoint}]:`, error);
      throw error;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  if (method === 'GET') {
    inFlightRequests.set(cacheKey, reqPromise);
  }

  return reqPromise;
}

export const api = {
  // Database status
  checkStatus: () => request('/status/'),

  // Projects
  getProjects: (params = {}) => {
    let qs = '';
    if (typeof params === 'string') {
      qs = `?user=${encodeURIComponent(params)}`;
    } else if (params && typeof params === 'object') {
      const q = new URLSearchParams();
      if (params.user) q.append('user', params.user);
      if (params.userEmail) q.append('userEmail', params.userEmail);
      if (params.userId) q.append('userId', params.userId);
      const s = q.toString();
      if (s) qs = `?${s}`;
    }
    return request(`/projects/${qs}`);
  },
  getProject: (id) => request(`/projects/${id}/`),
  createProject: (data) => request('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id, userParams = {}) => {
    const q = new URLSearchParams();
    if (userParams?.userEmail) q.append('userEmail', userParams.userEmail);
    if (userParams?.userId) q.append('userId', userParams.userId);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/projects/${id}/${qs}`, { method: 'DELETE' });
  },
  leaveProject: (id, userData = {}) => request(`/projects/${id}/leave/`, { method: 'POST', body: JSON.stringify(userData) }),
  getProjectEligibleAssignees: (id, params = {}) => {
    const q = new URLSearchParams();
    const userEmail = params.userEmail || params.user_email;
    const userId = params.userId || params.user_id;
    if (userEmail) q.append('userEmail', userEmail);
    if (userId) q.append('userId', userId);
    if (params.strategy) q.append('strategy', params.strategy);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/projects/${id}/eligible-assignees/${qs}`);
  },

  // Tasks
  getTasks: (params = {}) => {
    const q = new URLSearchParams();
    if (params.projectId) q.append('projectId', params.projectId);
    if (params.status) q.append('status', params.status);
    if (params.priority) q.append('priority', params.priority);
    if (params.search) q.append('search', params.search);
    const qs = q.toString();
    return request(`/tasks/${qs ? `?${qs}` : ''}`);
  },
  getTask: (id) => request(`/tasks/${id}/`),
  createTask: (data) => request('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/tasks/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/tasks/${id}/`, { method: 'DELETE' }),
  addTaskComment: (id, commentData) => request(`/tasks/${id}/comments/`, { method: 'POST', body: JSON.stringify(commentData) }),
  batchReorderTasks: (items) => request('/tasks/batch-order/', { method: 'POST', body: JSON.stringify({ items }) }),

  // Team
  getTeam: (owner = null) => {
    const qs = owner ? `?owner=${encodeURIComponent(owner)}` : '';
    return request(`/team/${qs}`);
  },
  addTeamMember: (query, owner = null, ownerDetails = {}) => request('/team/', {
    method: 'POST',
    body: JSON.stringify({ query, owner, ...ownerDetails })
  }),
  removeTeamMember: (id, owner = null) => {
    const qs = owner ? `?owner=${encodeURIComponent(owner)}` : '';
    return request(`/team/${id}/${qs}`, { method: 'DELETE' });
  },

  // Analytics
  getAnalytics: (projectId = null) => {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return request(`/analytics/${qs}`);
  },

  // Daily Activity & Audit Export (Manager only)
  getDailyActivity: (projectId, params = {}) => {
    const q = new URLSearchParams();
    if (params.startDate) q.append('startDate', params.startDate);
    if (params.endDate) q.append('endDate', params.endDate);
    if (params.date) q.append('date', params.date);
    if (params.user) q.append('user', params.user);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/projects/${projectId}/daily-activity/${qs}`);
  },
  exportDailyActivity: async (projectId, params = {}) => {
    const q = new URLSearchParams();
    if (params.startDate) q.append('startDate', params.startDate);
    if (params.endDate) q.append('endDate', params.endDate);
    if (params.date) q.append('date', params.date);
    if (params.user) q.append('user', params.user);
    const qs = q.toString() ? `?${q.toString()}` : '';

    const authHeaders = {};
    try {
      const raw = localStorage.getItem('taskflow_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u.email) authHeaders['X-User-Email'] = u.email;
        if (u.id || u._id) authHeaders['X-User-Id'] = String(u.id || u._id);
      }
    } catch (e) {}

    const res = await fetch(`${API_BASE}/projects/${projectId}/export-activity/${qs}`, {
      headers: authHeaders
    });
    if (!res.ok) {
      let err = 'Export failed';
      try {
        const j = await res.json();
        if (j.error) err = j.error;
      } catch (e) {}
      throw new Error(err);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    let filename = `TaskFlow_Activity_${params.date || 'Report'}.xlsx`;
    const fnMatch = disposition.match(/filename="?([^";]+)"?/);
    if (fnMatch && fnMatch[1]) {
      filename = fnMatch[1];
    }
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
  },

  // Auth
  register: (data) => request('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),
  login: (credentials) => request('/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),

  // Profile & Password Management
  getProfile: (params = {}) => {
    let qs = '';
    if (typeof params === 'string') {
      qs = `?userId=${encodeURIComponent(params)}`;
    } else if (params && typeof params === 'object') {
      const q = new URLSearchParams();
      if (params.userId) q.append('userId', params.userId);
      if (params.email) q.append('email', params.email);
      const s = q.toString();
      if (s) qs = `?${s}`;
    }
    return request(`/auth/profile/${qs}`);
  },
  updateProfile: (data) => request('/auth/profile/', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data) => request('/auth/change-password/', { method: 'POST', body: JSON.stringify(data) }),

  // Team Invitations
  sendTeamRequest: (data) => request('/team/send-request/', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: (params = {}) => {
    let email = '';
    if (typeof params === 'string') {
      email = params;
    } else if (params && typeof params === 'object') {
      email = params.userEmail || params.email || '';
    }
    const qs = email ? `?userEmail=${encodeURIComponent(email)}` : '';
    return request(`/notifications/${qs}`);
  },
  markNotificationRead: (data) => request('/notifications/mark-read/', { method: 'POST', body: JSON.stringify(data) }),
  respondTeamRequest: (data) => request('/notifications/respond-team-request/', { method: 'POST', body: JSON.stringify(data) }),
};

