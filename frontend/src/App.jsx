import React, { useState, useEffect, useRef } from 'react';
import {
  Home as HomeIcon,
  Folder,
  FolderKanban,
  Users,
  Plus,
  Kanban,
  List,
  BarChart3,
  Search,
  Calendar,
  User,
  Settings,
  Trash2,
  Edit3,
  Layers,
  ChevronRight,
  Filter,
  Globe,
  ArrowLeft,
  AlertTriangle,
  LogOut,
  FileSpreadsheet
} from 'lucide-react';
import { api, invalidateApiCache } from './api';
import Navbar from './components/Navbar';
import KanbanBoard from './components/KanbanBoard';
import ListView from './components/ListView';
import AnalyticsView from './components/AnalyticsView';
import HomeView from './components/HomeView';
import TeamView from './components/TeamView';
import ProjectsGalleryView from './components/ProjectsGalleryView';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ProjectMembersSection from './components/ProjectMembersSection';
import DailyActivityView from './components/DailyActivityView';
import ProfilePage from './components/ProfilePage';
import ProjectFormPage from './components/ProjectFormPage';
import TaskDetailsPage from './components/TaskDetailsPage';

export default function App() {
  // Page View: 'landing' | 'login' | 'signup' | 'workspace'
  const [pageView, setPageView] = useState(() => {
    const saved = localStorage.getItem('taskflow_user');
    return saved ? 'workspace' : 'landing';
  });

  // Current logged in user
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('taskflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Workspace navigation: 'home' | 'projects' | 'team' | 'profile' | 'new-project' | 'edit-project' | 'task-details' | 'new-task'
  const [currentSection, setCurrentSection] = useState('projects');
  const [projectSubView, setProjectSubView] = useState('gallery'); // 'gallery' | 'board'

  // UI state inside Projects view
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' | 'list' | 'analytics'
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [activeRole, setActiveRole] = useState(() => {
    if (currentUser?.role && currentUser.role.includes('Manager')) return 'manager';
    return 'manager'; // default
  });
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Page view target records
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [initialTaskStatus, setInitialTaskStatus] = useState('todo');

  // Navigation handlers (Eliminating popups entirely in favor of dedicated HTML pages)
  const openNewProjectPage = () => {
    setProjectToEdit(null);
    setCurrentSection('new-project');
  };

  const openEditProjectPage = (proj) => {
    setProjectToEdit(proj);
    setCurrentSection('edit-project');
  };

  const openNewTaskPage = (status = 'todo') => {
    setTaskToEdit(null);
    setInitialTaskStatus(status);
    setCurrentSection('new-task');
  };

  const openEditTaskPage = (task) => {
    setTaskToEdit(task);
    setCurrentSection('task-details');
  };

  const openProfilePage = () => {
    setCurrentSection('profile');
  };

  // Notification-driven navigation handlers
  const handleNavigateToTask = async (projectId, taskId) => {
    setSelectedProjectId(projectId);
    setCurrentSection('projects');
    setProjectSubView('board');
    setActiveTab('kanban');

    if (taskId) {
      try {
        const projTasks = await api.getTasks({ projectId });
        setTasks(projTasks);
        const target = projTasks.find(t => t.id === taskId || t._id === taskId);
        if (target) {
          setTaskToEdit(target);
          setCurrentSection('task-details');
        }
      } catch (e) {
        console.error('Failed to load task for navigation:', e);
      }
    }
  };

  const handleNavigateToProject = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentSection('projects');
    setProjectSubView('board');
  };

  const handleNavigateToTeam = () => {
    setCurrentSection('team');
  };

  const fetchNotifications = async () => {
    if (!currentUser?.email) return;
    try {
      const notifs = await api.getNotifications({ userEmail: currentUser.email });
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const handleUpdateCurrentUser = (updatedUser) => {
    setCurrentUser(prev => ({ ...prev, ...updatedUser }));
    try {
      const saved = localStorage.getItem('taskflow_user');
      const parsed = saved ? JSON.parse(saved) : {};
      localStorage.setItem('taskflow_user', JSON.stringify({ ...parsed, ...updatedUser }));
    } catch (e) {}
  };

  // Helper to determine if a project belongs to the current user (as manager or team member)
  const isUserProject = (p, user) => {
    if (!user) return true;
    const uName = (user.firstName ? `${user.firstName} ${user.lastName}` : user.name || '').toLowerCase().trim();
    const normEmail = (email) => {
      if (!email || typeof email !== 'string') return '';
      let e = email.trim().toLowerCase();
      if (!e.includes('@') && e.includes('.')) {
        const parts = e.split('.');
        if (parts.length >= 2) {
          e = parts[0] + '@' + parts.slice(1).join('.');
        }
      }
      return e;
    };

    const uEmail = normEmail(user.email);
    const uId = String(user.id || user._id || '').trim();

    const pManagerEmail = normEmail(p.managerEmail);
    const pCreatedBy = String(p.createdBy || '').trim();

    if (uEmail && pManagerEmail && pManagerEmail === uEmail) return true;
    if (uId && pCreatedBy && pCreatedBy === uId) return true;

    if (uEmail === 'alex.mercer@company.com' && (!pManagerEmail || pManagerEmail === 'alex.mercer@company.com')) {
      if ((p.manager || '').toLowerCase().includes('alex') || !pCreatedBy || pCreatedBy === 'u1' || pCreatedBy === '65f00990a0b1c2d3e4f50001') {
        return true;
      }
    }

    if (p.teamMembers && Array.isArray(p.teamMembers)) {
      return p.teamMembers.some(m => {
        if (!m) return false;
        const mEmail = normEmail(m.email);
        const mId = String(m.id || m._id || m.userId || '').trim();
        if (uEmail && mEmail && mEmail === uEmail) return true;
        if (uId && mId && mId === uId) return true;
        return false;
      });
    }

    return false;
  };

  // Helper to determine if a project was created / is managed by the current user (Strictly by Email / ID)
  const isProjectCreatorOrManager = (p, user = currentUser) => {
    if (!p || !user) return false;
    const normEmail = (email) => {
      if (!email || typeof email !== 'string') return '';
      let e = email.trim().toLowerCase();
      if (!e.includes('@') && e.includes('.')) {
        const parts = e.split('.');
        if (parts.length >= 2) {
          e = parts[0] + '@' + parts.slice(1).join('.');
        }
      }
      return e;
    };

    const uEmail = normEmail(user.email);
    const uId = String(user.id || user._id || '').trim();

    const pManagerEmail = normEmail(p.managerEmail);
    const pCreator = String(p.createdBy || '').trim();

    // 1. Direct match on manager email
    if (uEmail && pManagerEmail && pManagerEmail === uEmail) return true;

    // 2. Direct match on creator ID
    if (uId && pCreator && pCreator === uId) return true;

    // 3. Fallback for seed demo projects (Alex Mercer)
    if (uEmail === 'alex.mercer@company.com' && (!pManagerEmail || pManagerEmail === 'alex.mercer@company.com')) {
      if ((p.manager || '').toLowerCase().includes('alex') || !pCreator || pCreator === 'u1' || pCreator === '65f00990a0b1c2d3e4f50001') {
        return true;
      }
    }

    return false;
  };

  const isInitialMount = useRef(true);

  // Load Projects, Team, Tasks & Notifications once on initial mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload projects & team only when user genuinely changes (e.g. login/switch)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (currentUser) {
      const ownerKey = currentUser?.email || currentUser?.id || currentUser?._id;
      const userParams = {
        userEmail: currentUser?.email,
        userId: currentUser?.id || currentUser?._id
      };
      Promise.all([
        api.getProjects(userParams),
        api.getTeam(ownerKey),
        api.getNotifications({ userEmail: currentUser.email })
      ]).then(([pList, tList, nList]) => {
        setProjects(pList);
        setTeamMembers(tList);
        setNotifications(nList);
        const myProjs = pList.filter(p => isUserProject(p, currentUser));
        if (myProjs.length > 0) {
          setSelectedProjectId(myProjs[0].id);
        } else {
          setSelectedProjectId(null);
        }
      }).catch(console.error);
    }
  }, [currentUser]);

  // Periodic polling for notifications (every 7 seconds) and on window focus
  useEffect(() => {
    if (!currentUser?.email) return;

    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 7000);

    const onFocus = () => {
      fetchNotifications();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser?.email]);

  // Reload tasks when selected project or filters change
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectTasks();
    }
  }, [selectedProjectId, searchQuery, priorityFilter]);

  // Hash synchronization for browser history & proper URLs
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (!hash) return;
      if (hash === 'profile') {
        setCurrentSection('profile');
      } else if (hash === 'home') {
        setCurrentSection('home');
      } else if (hash === 'team') {
        setCurrentSection('team');
      } else if (hash === 'projects') {
        setCurrentSection('projects');
        setProjectSubView('gallery');
      } else if (hash === 'projects/new') {
        setProjectToEdit(null);
        setCurrentSection('new-project');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (pageView !== 'workspace') return;
    let targetHash = `#/${currentSection}`;
    if (currentSection === 'new-project') targetHash = '#/projects/new';
    if (currentSection === 'edit-project' && projectToEdit) targetHash = `#/projects/${projectToEdit.id || projectToEdit._id}/edit`;
    if (currentSection === 'new-task') targetHash = `#/tasks/new`;
    if (currentSection === 'task-details' && taskToEdit) targetHash = `#/tasks/${taskToEdit.id}`;
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, '', targetHash);
    }
  }, [currentSection, projectToEdit, taskToEdit, pageView]);

  const loadInitialData = async () => {
    setLoadingProjects(true);
    try {
      const ownerKey = currentUser?.email || currentUser?.id || currentUser?._id;
      const userParams = {
        userEmail: currentUser?.email,
        userId: currentUser?.id || currentUser?._id
      };
      const promises = [
        api.getProjects(userParams),
        api.getTeam(ownerKey),
        api.getTasks()
      ];
      if (currentUser?.email) {
        promises.push(api.getNotifications({ userEmail: currentUser.email }));
      }
      const [projs, team, allT, notifs] = await Promise.all(promises);
      setProjects(projs);
      setTeamMembers(team);
      setAllTasks(allT);
      if (notifs) setNotifications(notifs);
      const myProjs = projs.filter(p => isUserProject(p, currentUser));
      if (myProjs.length > 0 && !selectedProjectId) {
        setSelectedProjectId(myProjs[0].id);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadProjectTasks = async () => {
    if (!selectedProjectId) return;
    setLoadingTasks(true);
    try {
      const data = await api.getTasks({
        projectId: selectedProjectId,
        search: searchQuery || undefined,
        priority: priorityFilter || undefined,
      });
      setTasks(data);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const userProjects = projects.filter(p => isUserProject(p, currentUser));
  const userTasks = allTasks.filter(t => userProjects.some(p => p.id === t.projectId));
  const selectedProject = userProjects.find(p => p.id === selectedProjectId) || userProjects[0] || null;

  // ---------------- Auth Handlers ----------------
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('taskflow_user', JSON.stringify(user));
    if (user.role && user.role.includes('Manager')) {
      setActiveRole('manager');
    } else {
      setActiveRole('member');
    }
    // Refresh team list to include newly registered user and teammates
    const ownerKey = user.email || user.id || user._id;
    api.getTeam(ownerKey).then(setTeamMembers).catch(() => {});
    setPageView('workspace');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('taskflow_user');
    setPageView('landing');
  };

  // ---------------- Project Handlers ----------------
  const handleSaveProject = async (data, projectId) => {
    if (projectId) {
      const updated = await api.updateProject(projectId, data);
      setProjects(prev => prev.map(p => p.id === projectId ? updated : p));
      setSelectedProjectId(projectId);
      setCurrentSection('projects');
      setProjectSubView('board');
    } else {
      const created = await api.createProject(data);
      setProjects(prev => [created, ...prev]);
      setSelectedProjectId(created.id);
      setCurrentSection('projects');
      setProjectSubView('board');
    }
  };

  const handleDeleteProject = async (projectId) => {
    const proj = projects.find(p => p.id === projectId || p._id === projectId);
    if (proj && !isProjectCreatorOrManager(proj, currentUser)) {
      alert('You cannot delete this project because you did not create it. You can leave the project instead.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this project and all its tasks? This action cannot be undone.')) {
      try {
        const userParams = {
          userEmail: currentUser?.email,
          userId: currentUser?.id || currentUser?._id
        };
        const projId = proj ? (proj.id || proj._id) : projectId;
        await api.deleteProject(projId, userParams);
        const remaining = projects.filter(p => p.id !== projId && p._id !== projId);
        setProjects(remaining);
        const remainingUser = remaining.filter(p => isUserProject(p, currentUser));
        setSelectedProjectId(remainingUser[0]?.id || null);
        setProjectSubView('gallery');
        setTasks([]);
        setAllTasks(prev => prev.filter(t => t.projectId !== projId));
      } catch (err) {
        alert('Failed to delete project: ' + err.message);
      }
    }
  };

  const handleLeaveProject = async (projectId) => {
    const proj = projects.find(p => p.id === projectId || p._id === projectId);
    if (!proj) return;

    if (!window.confirm(`Are you sure you want to leave "${proj.title}"? You will be removed from this project's team members.`)) {
      return;
    }

    try {
      const projId = proj.id || proj._id;
      const currentUserName = (currentUser ? (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.name) : '').toLowerCase().trim();
      const currentUserEmail = (currentUser?.email || '').toLowerCase().trim();
      const currentUserId = String(currentUser?.id || currentUser?._id || '').trim();

      const updatedMembers = (proj.teamMembers || []).filter(m => {
        const mId = String(m.id || m._id || m.userId || '').trim();
        const mEmail = (m.email || '').toLowerCase().trim();
        const mName = (m.name || '').toLowerCase().trim();
        if (currentUserId && mId === currentUserId) return false;
        if (currentUserEmail && mEmail === currentUserEmail) return false;
        if (currentUserName && mName === currentUserName) return false;
        return true;
      });

      try {
        await api.leaveProject(projId, {
          userEmail: currentUser?.email,
          userId: currentUser?.id || currentUser?._id,
          name: currentUserName
        });
      } catch (e) {
        await api.updateProject(projId, { teamMembers: updatedMembers });
      }

      const updatedProjects = projects.map(p => (p.id === projId || p._id === projId) ? { ...p, teamMembers: updatedMembers } : p);
      setProjects(updatedProjects);

      const remainingUser = updatedProjects.filter(p => isUserProject(p, currentUser));
      setProjectSubView('gallery');
      setSelectedProjectId(remainingUser[0]?.id || null);
    } catch (err) {
      alert('Failed to leave project: ' + err.message);
    }
  };

  // ---------------- Task Handlers ----------------
  const handleSaveTask = async (data, taskId) => {
    if (selectedProject && !isProjectCreatorOrManager(selectedProject, currentUser)) {
      // Team member stage update
      if (taskId && data.status) {
        const updated = await api.updateTask(taskId, data);
        setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        setAllTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        setCurrentSection('projects');
        setProjectSubView('board');
        return;
      }
      alert('Permission denied: Only the project manager can change task data.');
      return;
    }
    if (taskId) {
      const updated = await api.updateTask(taskId, data);
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      setAllTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } else {
      const created = await api.createTask(data);
      setTasks(prev => [...prev, created]);
      setAllTasks(prev => [...prev, created]);
      if (selectedProjectId) {
        api.getProject(selectedProjectId).then(p => {
          if (p) {
            setProjects(prev => prev.map(old => old.id === p.id ? p : old));
          }
        }).catch(() => {});
      }
    }
    setCurrentSection('projects');
    setProjectSubView('board');
  };

  const handleDeleteTask = async (taskId) => {
    if (selectedProject && !isProjectCreatorOrManager(selectedProject, currentUser)) {
      alert('Permission denied: Only the project manager can delete tasks.');
      return;
    }
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setAllTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
    }
  };

  const handleMoveStage = async (taskId, newStatus) => {
    if (selectedProject && !isUserProject(selectedProject, currentUser)) {
      alert('Permission denied: Only project members or manager can move tasks.');
      return;
    }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      const updatedByName = currentUser?.firstName
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : (currentUser?.name || (activeRole === 'manager' ? 'Project Manager' : 'Team Member'));

      await api.updateTask(taskId, {
        status: newStatus,
        updatedBy: updatedByName
      });
    } catch (err) {
      console.error('Failed to update stage:', err);
      loadProjectTasks();
    }
  };

  // Quick Open Modal Helpers
  const openNewTaskModal = (status = 'todo') => {
    setTaskToEdit(null);
    setInitialTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  // ---------------- VIEW ROUTING ----------------

  // 1. Normal Home Landing Page
  if (pageView === 'landing') {
    return (
      <LandingPage
        onGoToLogin={() => setPageView('login')}
        onGoToSignup={() => setPageView('signup')}
        onEnterWorkspace={() => setPageView('workspace')}
        currentUser={currentUser}
      />
    );
  }

  // 2. Login Page
  if (pageView === 'login') {
    return (
      <AuthPage
        initialMode="login"
        onAuthSuccess={handleAuthSuccess}
        onGoHome={() => setPageView('landing')}
      />
    );
  }

  // 3. Sign In / Sign Up Page (First name, Last name, Email, Password)
  if (pageView === 'signup') {
    return (
      <AuthPage
        initialMode="signup"
        onAuthSuccess={handleAuthSuccess}
        onGoHome={() => setPageView('landing')}
      />
    );
  }

  // 4. Workspace View (Enterprise TaskFlow)
  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        onOpenNewProject={openNewProjectPage}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={openProfilePage}
        onGoToLanding={() => setPageView('landing')}
        onGoToLogin={() => setPageView('login')}
        onGoToSignup={() => setPageView('signup')}
        notifications={notifications}
        onRefreshNotifications={fetchNotifications}
        onRefreshTeam={async () => {
          try {
            const ownerKey = currentUser?.email || currentUser?.id || currentUser?._id;
            const refreshed = await api.getTeam(ownerKey);
            setTeamMembers(refreshed);
          } catch (err) {
            console.error('Failed to refresh team:', err);
          }
        }}
        onNavigateToTask={handleNavigateToTask}
        onNavigateToProject={handleNavigateToProject}
        onNavigateToTeam={handleNavigateToTeam}
      />

      <div className="main-content">
        {/* Left Sidebar with Home, Projects, Team, and Profile Sections */}
        <aside className="sidebar">
          {/* SECTION 1: HOME */}
          <div className="sidebar-nav-group">
            <button
              className={`sidebar-main-btn ${currentSection === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentSection('home')}
              id="sidebar-home-btn"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <HomeIcon size={17} color={currentSection === 'home' ? '#4f46e5' : 'var(--text-muted)'} />
                <span>Home Dashboard</span>
              </div>
            </button>
          </div>

          {/* SECTION 2: PROJECTS */}
          <div className="sidebar-nav-group">
            <button
              className={`sidebar-main-btn ${['projects', 'new-project', 'edit-project', 'new-task', 'task-details'].includes(currentSection) ? 'active' : ''}`}
              onClick={() => {
                setCurrentSection('projects');
                setProjectSubView('gallery');
              }}
              id="sidebar-projects-btn"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FolderKanban size={17} color={['projects', 'new-project', 'edit-project', 'new-task', 'task-details'].includes(currentSection) ? '#4f46e5' : 'var(--text-muted)'} />
                <span>Projects</span>
              </div>
              <span className="sidebar-badge-count">{userProjects.length}</span>
            </button>
          </div>

          {/* SECTION 3: TEAM */}
          <div className="sidebar-nav-group">
            <button
              className={`sidebar-main-btn ${currentSection === 'team' ? 'active' : ''}`}
              onClick={() => setCurrentSection('team')}
              id="sidebar-team-btn"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Users size={17} color={currentSection === 'team' ? '#4f46e5' : 'var(--text-muted)'} />
                <span>Team</span>
              </div>
              <span className="sidebar-badge-count">{teamMembers.length}</span>
            </button>
          </div>

          {/* SECTION 4: MY PROFILE & SETTINGS (PROPER FULL PAGE) */}
          <div className="sidebar-nav-group">
            <button
              className={`sidebar-main-btn ${currentSection === 'profile' ? 'active' : ''}`}
              onClick={openProfilePage}
              id="sidebar-profile-btn"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <User size={17} color={currentSection === 'profile' ? '#4f46e5' : 'var(--text-muted)'} />
                <span>My Profile</span>
              </div>
              <span className="sidebar-badge-count" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.7rem' }}>
                {currentUser?.role ? (currentUser.role.includes('Manager') ? 'Admin' : 'Member') : 'User'}
              </span>
            </button>
          </div>
        </aside>

        {/* Right Main Workspace Area */}
        <main className="workspace-area">
          {/* VIEW 1: HOME DASHBOARD */}
          {currentSection === 'home' && (
            <HomeView
              projects={userProjects}
              tasks={userTasks}
              teamMembers={teamMembers}
              onSelectProject={(projId) => {
                setSelectedProjectId(projId);
                setCurrentSection('projects');
                setProjectSubView('board');
              }}
              onOpenNewProject={openNewProjectPage}
              activeRole={activeRole}
            />
          )}

          {/* VIEW 2: TEAM SECTION */}
          {currentSection === 'team' && (
            <TeamView
              teamMembers={teamMembers}
              tasks={userTasks}
              projects={userProjects}
              currentUser={currentUser}
              onRefreshTeam={async () => {
                try {
                  const ownerKey = currentUser?.email || currentUser?.id || currentUser?._id;
                  const refreshed = await api.getTeam(ownerKey);
                  setTeamMembers(refreshed);
                } catch (err) {
                  console.error('Failed to refresh team:', err);
                }
              }}
              onNavigateToProjects={() => {
                setCurrentSection('projects');
                setProjectSubView('gallery');
              }}
              onSelectProject={(projId) => {
                setSelectedProjectId(projId);
                setCurrentSection('projects');
                setProjectSubView('board');
              }}
            />
          )}

          {/* VIEW 3: PROFILE & ACCOUNT SETTINGS (PROPER FULL HTML PAGE) */}
          {currentSection === 'profile' && (
            <ProfilePage
              currentUser={currentUser}
              onUpdateUser={handleUpdateCurrentUser}
              onLogout={handleLogout}
              onBack={() => {
                setCurrentSection('projects');
                setProjectSubView('gallery');
              }}
            />
          )}

          {/* VIEW 4: CREATE / EDIT PROJECT (PROPER FULL HTML PAGE) */}
          {(currentSection === 'new-project' || currentSection === 'edit-project') && (
            <ProjectFormPage
              projectToEdit={currentSection === 'edit-project' ? projectToEdit : null}
              currentUser={currentUser}
              teamMembers={teamMembers}
              onSave={async (data, projectId) => {
                await handleSaveProject(data, projectId);
              }}
              onDelete={async (projectId) => {
                await handleDeleteProject(projectId);
              }}
              onBack={() => {
                setCurrentSection('projects');
              }}
              isProjectManager={!projectToEdit || isProjectCreatorOrManager(projectToEdit, currentUser)}
            />
          )}

          {/* VIEW 5: TASK DETAILS / CREATE TASK (PROPER FULL HTML PAGE) */}
          {(currentSection === 'task-details' || currentSection === 'new-task') && (
            <TaskDetailsPage
              taskToEdit={currentSection === 'task-details' ? taskToEdit : null}
              projectId={selectedProjectId}
              project={selectedProject}
              initialStatus={initialTaskStatus}
              teamMembers={teamMembers}
              activeRole={activeRole}
              isProjectManager={isProjectCreatorOrManager(selectedProject, currentUser)}
              currentUser={currentUser}
              onSave={async (data, taskId) => {
                await handleSaveTask(data, taskId);
              }}
              onDelete={async (taskId) => {
                await handleDeleteTask(taskId);
              }}
              onBack={() => {
                setCurrentSection('projects');
                setProjectSubView('board');
              }}
            />
          )}

          {/* VIEW 6: PROJECTS SECTION */}
          {currentSection === 'projects' && (
            projectSubView === 'gallery' || !selectedProject ? (
              <ProjectsGalleryView
                projects={userProjects}
                tasks={userTasks}
                currentUser={currentUser}
                activeRole={activeRole}
                onSelectProject={(projId) => {
                  setSelectedProjectId(projId);
                  setProjectSubView('board');
                }}
                onOpenNewProject={openNewProjectPage}
                onEditProject={openEditProjectPage}
                onDeleteProject={handleDeleteProject}
                onLeaveProject={handleLeaveProject}
              />
            ) : (
              <>
                {/* Back to Projects Gallery Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setProjectSubView('gallery')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.85rem',
                      padding: '0.45rem 1rem',
                      borderRadius: '8px'
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Projects</span>
                  </button>
                </div>

                {/* Project Header Banner (Streamlined) */}
                <div className="project-banner" style={{ padding: '1.15rem 1.4rem', marginBottom: '0.85rem' }}>
                  <div className="project-banner-top" style={{ marginBottom: selectedProject.description ? '0.4rem' : '0' }}>
                    <div className="project-title-group">
                      <h1 style={{ fontSize: '1.45rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span>{selectedProject.title}</span>
                        <span className="project-key-tag" style={{ fontSize: '0.8rem', padding: '0.15rem 0.5rem' }}>
                          {selectedProject.key}
                        </span>
                        <span className={`priority-badge priority-${selectedProject.priority || 'medium'}`} style={{ fontSize: '0.75rem' }}>
                          {selectedProject.priority || 'medium'}
                        </span>
                      </h1>
                      {selectedProject.description && (
                        <p className="project-desc" style={{ fontSize: '0.85rem', margin: '0.2rem 0 0' }}>{selectedProject.description}</p>
                      )}
                    </div>

                    {/* Actions: Manager/Creator gets Edit, Add Task, Delete. Non-creator/Team Member gets Add Task, Leave Project */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {isProjectCreatorOrManager(selectedProject, currentUser) ? (
                        <>
                          <button
                            className="btn btn-secondary"
                            onClick={() => openEditProjectPage(selectedProject)}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={() => openNewTaskPage('todo')}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                          >
                            <Plus size={14} />
                            <span>Add Task</span>
                          </button>
                          <button
                            className="btn btn-danger"
                            title="Delete project"
                            onClick={() => handleDeleteProject(selectedProject.id || selectedProject._id)}
                            style={{ padding: '0.4rem 0.6rem' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn"
                          title="Leave this project"
                          onClick={() => handleLeaveProject(selectedProject.id || selectedProject._id)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fecaca';
                            e.currentTarget.style.borderColor = '#fca5a5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fee2e2';
                            e.currentTarget.style.borderColor = '#fecaca';
                          }}
                        >
                          <LogOut size={13} />
                          <span>Leave</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compact Project Metadata */}
                  <div className="project-meta-row" style={{ marginTop: '0.45rem', fontSize: '0.8rem' }}>
                    <div className="meta-item">
                      <User size={13} color="#4f46e5" />
                      <span>Manager: <strong>{selectedProject.manager || 'Alex Mercer'}</strong></span>
                    </div>
                    {selectedProject.dueDate && (
                      <div className="meta-item">
                        <Calendar size={13} color="#fbbf24" />
                        <span>Due: <strong>{selectedProject.dueDate}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Team Members Section (Between Project Banner and View Controls) */}
                <ProjectMembersSection
                  project={selectedProject}
                  teamMembers={teamMembers}
                  currentUser={currentUser}
                  onUpdateProject={(updatedProj) => {
                    invalidateApiCache();
                    setProjects(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));
                  }}
                />

                {/* View Controls: Tabs & Filters */}
                <div className="view-controls">
                  <div className="tab-group">
                    <button
                      className={`tab-btn ${activeTab === 'kanban' ? 'active' : ''}`}
                      onClick={() => setActiveTab('kanban')}
                    >
                      <Kanban size={16} />
                      <span>Kanban Board</span>
                    </button>
                    <button
                      className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                      onClick={() => setActiveTab('list')}
                    >
                      <List size={16} />
                      <span>List View</span>
                    </button>
                    <button
                      className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                      onClick={() => setActiveTab('analytics')}
                    >
                      <BarChart3 size={16} />
                      <span>Project Metrics</span>
                    </button>
                    {isProjectCreatorOrManager(selectedProject, currentUser) && (
                      <button
                        className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                        onClick={() => setActiveTab('activity')}
                        id="daily-activity-tab-btn"
                        title="Daily Activity & Excel Export (Project Manager only)"
                      >
                        <FileSpreadsheet size={16} color={activeTab === 'activity' ? '#4f46e5' : '#10b981'} />
                        <span>Daily Activity & Export</span>
                      </button>
                    )}
                  </div>

                  {activeTab !== 'analytics' && activeTab !== 'activity' && (
                    <div className="filters-group">
                      <div className="search-input-wrap">
                        <Search size={14} />
                        <input
                          type="text"
                          className="search-input"
                          placeholder="Search tasks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <select
                        className="filter-select"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                      >
                        <option value="">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>

                      {isProjectCreatorOrManager(selectedProject, currentUser) && (
                        <button
                          className="btn-quick-export"
                          onClick={() => setActiveTab('activity')}
                          title="Open Daily Activity to export Excel"
                        >
                          <FileSpreadsheet size={14} />
                          <span>Export Daily Log</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* View Content */}
                {loadingTasks ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading tasks from database...
                  </div>
                ) : activeTab === 'kanban' ? (
                  <KanbanBoard
                    tasks={tasks}
                    onTaskClick={openEditTaskPage}
                    onMoveStage={handleMoveStage}
                    onOpenNewTask={openNewTaskPage}
                    activeRole={activeRole}
                    isProjectManager={isProjectCreatorOrManager(selectedProject, currentUser)}
                    canMoveTasks={isUserProject(selectedProject, currentUser)}
                    teamMembers={teamMembers}
                    project={selectedProject}
                    currentUser={currentUser}
                  />
                ) : activeTab === 'list' ? (
                  <ListView
                    tasks={tasks}
                    onTaskClick={openEditTaskPage}
                    onMoveStage={handleMoveStage}
                    isProjectManager={isProjectCreatorOrManager(selectedProject, currentUser)}
                    teamMembers={teamMembers}
                    project={selectedProject}
                    currentUser={currentUser}
                  />
                ) : activeTab === 'analytics' ? (
                  <AnalyticsView projectId={selectedProject.id} />
                ) : activeTab === 'activity' && isProjectCreatorOrManager(selectedProject, currentUser) ? (
                  <DailyActivityView
                    projectId={selectedProject.id || selectedProject._id}
                    project={selectedProject}
                    currentUser={currentUser}
                  />
                ) : (
                  <KanbanBoard
                    tasks={tasks}
                    onTaskClick={openEditTaskPage}
                    onMoveStage={handleMoveStage}
                    onOpenNewTask={openNewTaskPage}
                    activeRole={activeRole}
                    isProjectManager={isProjectCreatorOrManager(selectedProject, currentUser)}
                    canMoveTasks={isUserProject(selectedProject, currentUser)}
                    teamMembers={teamMembers}
                    project={selectedProject}
                    currentUser={currentUser}
                  />
                )}
              </>
            )
          )}
        </main>
      </div>
    </div>
  );
}
