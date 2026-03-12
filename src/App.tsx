import { useState, useEffect } from 'preact/hooks';
import { Router, Route, route } from 'preact-router';
import { Navbar, BottomNav, Sidebar } from './components/Navigation';
import BoardView from './views/BoardView';
import { DashboardView } from './views/DashboardView';
import { CalendarView } from './views/CalendarView';
import { TeamView } from './views/TeamView';
import { SprintView } from './views/SprintView';
import { BacklogView } from './views/BacklogView';
import { ProjectSettingsView } from './views/ProjectSettingsView';
import { ProfileSettingsView } from './views/ProfileSettingsView';
import { LoginView } from './views/LoginView';
import { LandingView } from './views/LandingView';
import { StorybookView } from './views/StorybookView';
import { db, Project, User } from './services/db';
import { Modal } from './components/Modal';
import { ProjectForm } from './components/ProjectForm';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showLanding, setShowLanding] = useState(() => localStorage.getItem('hasSeenLanding') !== 'true');
  const [isDbReady, setIsDbReady] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshProjects = async () => {
    const projectsData = await db.getProjects();
    setProjects(projectsData);
    return projectsData;
  };

  const refreshUser = async () => {
    const users = await db.getUsers();
    let myId = localStorage.getItem('myUserId');
    let me = users.find(u => u.id === myId);
    
    if (!me && myId === 'me') {
      me = users.find(u => u.initials === 'ME');
      if (me) localStorage.setItem('myUserId', me.id);
    }

    if (!me && users.length > 0) {
      me = users[0];
      localStorage.setItem('myUserId', me.id);
    }
    setCurrentUser(me || null);
  };

  useEffect(() => {
    const initDb = async () => {
      try {
        await db.init();
        setIsDbReady(true);
        const projectsData = await refreshProjects();
        await refreshUser();
        
        // Handle initial routing or project selection
        const path = window.location.pathname;
        const projectMatch = path.match(/\/project\/([^/]+)/);
        if (projectMatch) {
          const project = await db.getProjectByName(projectMatch[1]);
          if (project) {
            setCurrentProjectId(project.id);
          } else {
            // Try by ID if name fails
            const allProj = await db.getProjects();
            const byId = allProj.find(p => p.id === projectMatch[1]);
            if (byId) setCurrentProjectId(byId.id);
          }
        } else if (projectsData.length > 0) {
          setCurrentProjectId(projectsData[0].id);
          // Redirect to first project's dashboard if at root and logged in
          if (isLoggedIn && (path === '/' || path === '')) {
            route(`/project/${slugify(projectsData[0].name)}/dashboard`);
          }
        }
        console.log('Database initialized successfully');
      } catch (err) {
        console.error('Database initialization failed:', err);
      }
    };
    initDb();

    // Listen for route changes
    const handleRouteChange = async (e: any) => {
      const path = e.url || window.location.pathname;
      const projectMatch = path.match(/\/project\/([^/]+)/);
      if (projectMatch) {
        const project = await db.getProjectByName(projectMatch[1]);
        if (project && project.id !== currentProjectId) {
          setCurrentProjectId(project.id);
        }
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    
    const handleProfileUpdate = () => refreshUser();
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('isLoggedIn', isLoggedIn.toString());
    if (isLoggedIn && projects.length > 0 && (window.location.pathname === '/' || window.location.pathname === '')) {
      const proj = projects.find(p => p.id === currentProjectId) || projects[0];
      route(`/project/${slugify(proj.name)}/dashboard`);
    }
  }, [isLoggedIn, projects, currentProjectId]);

  useEffect(() => {
    if (isDbReady && isLoggedIn && !currentProjectId && projects.length > 0) {
      setCurrentProjectId(projects[0].id);
      route(`/project/${slugify(projects[0].name)}/dashboard`);
    }
  }, [isDbReady, isLoggedIn, currentProjectId, projects]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, '_');

  const handleCreateProject = async (data: { name: string; description: string; color: string; startDate: string; endDate: string }) => {
    const id = await db.addProject(data);
    await refreshProjects();
    setCurrentProjectId(id);
    setIsProjectModalOpen(false);
    route(`/project/${slugify(data.name)}/dashboard`);
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await db.deleteProject(id);
      const projectsData = await refreshProjects();
      if (currentProjectId === id) {
        const nextId = projectsData.length > 0 ? projectsData[0].id : null;
        setCurrentProjectId(nextId);
        if (nextId) {
          route(`/project/${slugify(projectsData[0].name)}/dashboard`);
        } else {
          route('/');
        }
      }
    }
  };

  const handleProjectUpdate = async () => {
    await refreshProjects();
  };

  const handleProjectChange = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    setCurrentProjectId(id);
    // Maintain the current view type when switching projects
    const path = window.location.pathname;
    const viewMatch = path.match(/\/project\/[^/]+\/([^/]+)/);
    const view = viewMatch ? viewMatch[1] : 'dashboard';
    route(`/project/${slugify(project.name)}/${view}`);
  };

  const currentProject = projects.find(p => p.id === currentProjectId) || null;

  if (showLanding && !isLoggedIn) {
    return <LandingView onGetStarted={() => setShowLanding(false)} />;
  }

  if (!isLoggedIn) {
    return <LoginView onLogin={() => setIsLoggedIn(true)} />;
  }

  if (!isDbReady) {
    return <div className="flex min-h-screen items-center justify-center bg-app-background text-app-text-primary">Initializing Database...</div>;
  }

  return (
    <div className="flex min-h-screen bg-app-background text-app-text-primary font-sans pb-16 lg:pb-0">
      <Sidebar 
        onCreateProject={() => setIsProjectModalOpen(true)}
        currentProject={currentProject}
        projects={projects}
        onProjectChange={handleProjectChange}
        onDeleteProject={handleDeleteProject}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        currentUser={currentUser}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar 
          onToggleTheme={toggleTheme} 
          isDark={isDark} 
          currentProject={currentProject}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={currentUser}
        />
        
        {!isOnline && (
          <div className="bg-amber-500 text-white text-center py-1 text-xs font-bold animate-pulse">
            You are currently working offline. Changes will be saved locally.
          </div>
        )}
        
        <main className="flex-1 overflow-hidden flex flex-col">
          <Router>
            <Route path="/project/:name/dashboard" component={DashboardView} currentProject={currentProject} />
            <Route path="/project/:name/board" component={BoardView} currentProject={currentProject} searchQuery={searchQuery} />
            <Route path="/project/:name/calendar" component={CalendarView} currentProject={currentProject} />
            <Route path="/project/:name/sprints" component={SprintView} currentProject={currentProject} />
            <Route path="/project/:name/backlog" component={BacklogView} currentProject={currentProject} />
            <Route path="/project/:name/team" component={TeamView} />
            <Route path="/project/:name/settings" component={ProjectSettingsView} currentProject={currentProject} onUpdate={handleProjectUpdate} onDelete={handleDeleteProject} />
            <Route path="/project/:name/profile" component={ProfileSettingsView} />
            <Route path="/storybook" component={StorybookView} />
            {/* Fallback */}
            <Route default component={DashboardView} currentProject={currentProject} />
          </Router>
        </main>
 
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          <BottomNav 
            onCreateProject={() => setIsProjectModalOpen(true)} 
            currentProject={currentProject}
          />
        </div>
      </div>

      <Modal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        title="Create New Project"
      >
        <ProjectForm 
          onSubmit={handleCreateProject} 
          onCancel={() => setIsProjectModalOpen(false)} 
        />
      </Modal>
    </div>
  );
}
