import { useState } from 'preact/hooks';
import { Link, route } from 'preact-router';
import { Icon } from './Icon';
import {
  LayoutDashboard, ListTodo, Calendar, Settings, Plus, Search,
  Bell, Sun, Moon, Rocket,
  ChevronRight, ChevronLeft, Trash2,
  Inbox
} from 'lucide-preact';
import { Avatar } from './Avatar';
import { Project } from '../services/db';

const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, '_');

interface SidebarProps {
  onCreateProject?: () => void;
  currentProject: Project | null;
  projects: Project[];
  onProjectChange: (id: string) => void;
  onDeleteProject: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar = ({
  onCreateProject,
  currentProject,
  projects,
  onProjectChange,
  onDeleteProject,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const path = window.location.pathname;
  const match = path.match(/\/project\/[^/]+\/([^/]+)/);
  const activeTab = match ? match[1] : (path === '/' ? 'dashboard' : '');

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'board', label: 'Kanban Board', icon: ListTodo },
    { id: 'backlog', label: 'Backlog', icon: Inbox },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`hidden lg:flex flex-col bg-app-surface border-r border-app-border h-screen sticky top-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`p-6 flex items-center justify-between ${isCollapsed ? 'px-4' : ''}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => route('/')}>
            <div className="p-2 rounded-xl flex-shrink-0 shadow-lg" style={{ backgroundColor: currentProject?.color || '#3b82f6' }}>
              <Rocket className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-app-text-primary truncate">
              {currentProject?.name || 'ProjectTracker'}
            </span>
          </div>
        )}
        {isCollapsed && (
          <div className="p-2 rounded-xl mx-auto shadow-lg" style={{ backgroundColor: currentProject?.color || '#3b82f6' }}>
            <Rocket className="text-white" size={20} />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg hover:bg-app-border transition-colors text-app-text-secondary ${isCollapsed ? 'hidden' : ''}`}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {isCollapsed && (
        <div className="flex justify-center py-2">
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-app-border transition-colors text-app-text-secondary"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      <div className={`px-4 mb-4 relative ${isCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
          className={`w-full flex items-center gap-3 px-4 py-2 bg-app-background border border-app-border rounded-xl text-sm font-bold text-app-text-primary hover:border-primary/50 transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
          {!isCollapsed && <span className="truncate flex-1 text-left">{currentProject?.name || 'Select Project'}</span>}
          <ChevronRight size={14} className={`transition-transform ${isProjectDropdownOpen ? 'rotate-90' : ''} ${isCollapsed ? 'mx-auto' : ''}`} />
        </button>

        {isProjectDropdownOpen && (
          <div className={`absolute left-4 right-4 top-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl z-50 py-2 max-h-60 overflow-y-auto ${isCollapsed ? 'left-full ml-2 w-48' : ''}`}>
            {projects.map(p => (
              <div key={p.id} className="flex items-center group">
                <button
                  onClick={() => { onProjectChange(p.id); setIsProjectDropdownOpen(false); }}
                  className={`flex-1 text-left px-4 py-2 text-sm hover:bg-primary/10 transition-colors ${currentProject?.id === p.id ? 'text-primary font-bold' : 'text-app-text-primary'}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.name}</span>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                  className="px-3 py-2 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="h-px bg-app-border my-1"></div>
            <button
              onClick={() => { onCreateProject?.(); setIsProjectDropdownOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-primary font-bold hover:bg-primary/10 transition-colors flex items-center gap-2"
            >
              <Plus size={14} />
              <span>New Project</span>
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map(item => {
          const href = currentProject ? `/project/${slugify(currentProject.name)}/${item.id}` : '#';
          return (
            <Link
              key={item.id}
              href={href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                activeTab === item.id
                  ? 'bg-primary/10 text-primary dark:text-blue-400 font-bold shadow-sm'
                  : 'text-app-text-secondary hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary/80 dark:hover:text-blue-300'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.label : ''}
              {...({} as any)}
            >
              <Icon
                icon={item.icon}
                size={20}
                className={activeTab === item.id ? 'text-primary' : 'text-app-text-secondary group-hover:text-primary transition-colors'}
              />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Phase 0 placeholder — replaced with real auth identity in Phase 1 */}
      <div className="p-4 border-t border-app-border">
        <div className={`bg-app-background p-3 rounded-[32px] flex items-center gap-3 ${isCollapsed ? 'p-1.5 rounded-2xl justify-center' : ''}`}>
          {!isCollapsed && (
            <p className="text-sm text-app-text-secondary">Sign in to see your profile</p>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4">
          <button
            onClick={onCreateProject}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span>New Project</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export const Navbar = ({
  onToggleTheme,
  isDark,
  currentProject,
  searchQuery,
  onSearchChange,
}: {
  onToggleTheme: () => void;
  isDark: boolean;
  currentProject: Project | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) => {
  return (
    <header className="sticky top-0 z-10 bg-app-background/80 backdrop-blur-md border-b border-app-border px-4 py-4 lg:px-8">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4 flex-1">
          <div className="lg:hidden flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: currentProject?.color || '#3b82f6' }}>
              <Rocket className="text-white" size={16} />
            </div>
          </div>
          <div className="relative max-w-md w-full hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-secondary" size={18} />
            <input
              type="text"
              placeholder="Search tasks, projects..."
              value={searchQuery}
              onInput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
              className="w-full pl-10 pr-4 py-2 bg-app-surface border border-app-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-2xl hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300"
            title="Toggle Theme"
          >
            <Icon icon={isDark ? Sun : Moon} className="text-app-text-primary" />
          </button>
          <button className="p-2 rounded-2xl hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 relative">
            <Icon icon={Bell} className="text-app-text-secondary" />
            <span className="absolute top-2 right-2 size-2 bg-rose-500 rounded-full border-2 border-app-background"></span>
          </button>

          <div className="h-8 w-px bg-app-border hidden md:block mx-2"></div>

          {/* Phase 0 placeholder — replaced with real auth identity in Phase 1 */}
          <div className="flex items-center gap-3 pl-2 p-1 rounded-xl">
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-app-text-primary">Guest</p>
              <div className="flex items-center gap-1 text-[10px] text-app-text-secondary">
                <span className="truncate max-w-[100px]">Project: {currentProject?.name || 'None'}</span>
                <ChevronRight size={10} />
              </div>
            </div>
            <div className="size-6 rounded-full bg-primary/20" />
          </div>
        </div>
      </div>
    </header>
  );
};

export const BottomNav = ({ onCreateProject, currentProject }: { onCreateProject?: () => void; currentProject: Project | null }) => {
  const path = window.location.pathname;
  const match = path.match(/\/project\/[^/]+\/([^/]+)/);
  const activeTab = match ? match[1] : (path === '/' ? 'dashboard' : '');

  const tabs = [
    { id: 'dashboard', label: 'Board', icon: LayoutDashboard },
    { id: 'board', label: 'Tasks', icon: ListTodo },
    { id: 'calendar', label: 'Plan', icon: Calendar },
    { id: 'settings', label: 'Setup', icon: Settings },
  ];

  return (
    <nav className="bg-app-background border-t border-app-border px-6 py-2 pb-6 flex items-center justify-between sticky bottom-0 z-20">
      {tabs.slice(0, 2).map(tab => (
        <Link
          key={tab.id}
          href={currentProject ? `/project/${slugify(currentProject.name)}/${tab.id}` : '#'}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-app-text-secondary'}`}
          {...({} as any)}
        >
          <Icon icon={tab.icon} size={24} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
        </Link>
      ))}

      <div className="relative -top-6">
        <button onClick={onCreateProject} className="size-14 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center text-white border-4 border-app-background">
          <Icon icon={Plus} size={32} />
        </button>
      </div>

      {tabs.slice(2).map(tab => (
        <Link
          key={tab.id}
          href={currentProject ? `/project/${slugify(currentProject.name)}/${tab.id}` : '#'}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-app-text-secondary'}`}
          {...({} as any)}
        >
          <Icon icon={tab.icon} size={24} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
};
