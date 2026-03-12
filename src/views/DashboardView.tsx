import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { CheckCircle, Bolt, Rocket, Palette, TrendingUp, TrendingDown, Clock, MessageSquare, Search, HelpCircle, ChevronDown, MoreVertical, Layout, FileText, Users as UsersIcon, Loader2 } from 'lucide-preact';
import { Avatar } from '../components/Avatar';
import { db, Task, Project, Activity, User } from '../services/db';

export const DashboardView = ({ currentProject }: { currentProject: Project | null }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentProject) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const [tasksData, activitiesData, usersData] = await Promise.all([
          db.getTasks(currentProject.id),
          db.getActivities(currentProject.id),
          db.getUsers()
        ]);
        setTasks(tasksData);
        setActivities(activitiesData);
        setUsers(usersData);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentProject]);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const activeTasksCount = tasks.filter(t => !t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Calculate average progress
  const avgProgress = totalTasks > 0 
    ? Math.round(tasks.reduce((acc, t) => acc + (t.progress || 0), 0) / totalTasks) 
    : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div className="size-20 bg-app-surface rounded-full flex items-center justify-center mb-6">
          <Layout size={40} className="text-app-text-secondary" />
        </div>
        <h2 className="text-2xl font-bold text-app-text-primary mb-2">No Projects Found</h2>
        <p className="text-app-text-secondary max-w-md mb-8">
          Create a project to see your dashboard overview.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 lg:px-10 py-8 overflow-y-auto custom-scrollbar pb-24 lg:pb-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-app-text-primary">Dashboard Overview</h1>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-app-surface border border-app-border rounded-xl text-sm font-medium">
              <span className="text-app-text-secondary">Project:</span>
              <span className="text-app-text-primary">{currentProject.name}</span>
              <ChevronDown size={14} className="text-app-text-secondary" />
            </div>
            <button className="p-2 bg-app-surface border border-app-border rounded-xl text-app-text-secondary hover:bg-primary/5 hover:text-primary transition-all">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatCard 
            title="Avg. Progress" 
            value={`${avgProgress}%`} 
            trend={avgProgress > 50 ? "+5%" : "-2%"} 
            trendDirection={avgProgress > 50 ? "up" : "down"}
            icon={Layout} 
            iconVariant="primary" 
          />
          <StatCard 
            title="Active Tasks" 
            value={activeTasksCount.toString()} 
            trend={activeTasksCount > 5 ? "+2" : "-1"} 
            trendDirection={activeTasksCount > 5 ? "up" : "down"}
            icon={CheckCircle} 
            iconVariant="amber" 
          />
          <StatCard 
            title="Completion" 
            value={`${completionRate}%`} 
            trend={completionRate > 70 ? "+8%" : "+2%"} 
            icon={Bolt} 
            iconVariant="emerald" 
          />
          <StatCard 
            title="Total Tasks" 
            value={totalTasks.toString()} 
            trend={totalTasks > 10 ? "+5" : "+1"} 
            icon={Clock} 
            iconVariant="primary" 
          />
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-lg font-bold text-app-text-primary">Project Efficiency Over Time</h2>
                  <p className="text-xs text-app-text-secondary mt-1">Measured by output vs estimated completion time</p>
                </div>
                <div className="flex items-center gap-2 bg-app-background p-1 rounded-xl border border-app-border">
                  {['30 Days', '90 Days', 'Year'].map(t => (
                    <button key={t} className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${t === '30 Days' ? 'bg-primary text-white shadow-sm' : 'text-app-text-secondary hover:text-app-text-primary'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Mock Chart Visualization */}
              <div className="h-64 relative mt-10">
                <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                      <feOffset dx="0" dy="4" result="offsetblur" />
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.2" />
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path 
                    d="M0,150 Q100,150 200,120 T400,80 T600,100 T800,50" 
                    fill="none" 
                    stroke="var(--color-primary)" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    filter="url(#shadow)"
                  />
                  <path 
                    d="M0,150 Q100,150 200,120 T400,80 T600,100 T800,50 L800,200 L0,200 Z" 
                    fill="url(#chartGradient)" 
                    className="opacity-20"
                  />
                  <circle cx="400" cy="80" r="6" fill="var(--color-primary)" stroke="white" strokeWidth="3" />
                  <circle cx="800" cy="50" r="6" fill="var(--color-primary)" stroke="white" strokeWidth="3" />
                </svg>
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] font-bold text-app-text-secondary uppercase tracking-widest pt-4">
                  <span>Week 1</span>
                  <span>Week 2</span>
                  <span>Week 3</span>
                  <span>Week 4</span>
                </div>
              </div>
            </Card>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-app-text-primary">Ongoing Tasks</h2>
                <button 
                  onClick={() => route(`/project/${currentProject.id}/board`)}
                  className="text-primary text-xs font-bold hover:underline"
                >
                  View all tasks
                </button>
              </div>
              <div className="space-y-4">
                {tasks.filter(t => !t.completed).slice(0, 3).map((task, i) => (
                  <Card key={i} className="flex items-center gap-4 p-5 rounded-2xl hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group cursor-pointer">
                    <div className={`flex size-12 items-center justify-center rounded-2xl transition-colors ${task.tagVariant === 'primary' ? 'text-primary bg-primary/10 group-hover:bg-primary/20' : 'text-indigo-500 bg-indigo-50 group-hover:bg-indigo-100'}`}>
                      <Rocket size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-app-text-primary group-hover:text-primary transition-colors">{task.title}</p>
                      <p className="text-app-text-secondary text-xs mt-0.5">{task.tag} • Updated 2h ago</p>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-bold text-app-text-primary">{task.progress || 0}%</span>
                      </div>
                      <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${task.progress || 0}%` }}></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-app-text-primary mb-6">Recent Activity</h2>
              <div className="space-y-8">
                {activities.length > 0 ? activities.slice(0, 5).map((activity, i) => {
                  const user = users.find(u => u.id === activity.userId);
                  return (
                    <div key={activity.id} className="flex gap-4 relative">
                      {i !== activities.slice(0, 5).length - 1 && <div className="absolute left-5 top-10 bottom-[-32px] w-px bg-app-border"></div>}
                      <Avatar initials={user?.initials || '??'} size="sm" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm leading-snug">
                          <span className="font-bold text-app-text-primary">{user?.name || 'System'}</span>
                          <span className="text-app-text-secondary"> {activity.content} </span>
                        </p>
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-app-text-secondary" />
                          <span className="text-[10px] font-medium text-app-text-secondary">
                            {new Date(activity.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-app-text-secondary text-center py-4">No recent activity.</p>
                )}
              </div>
              <button 
                onClick={() => alert('Activity history feature coming soon!')}
                className="w-full mt-8 py-3 text-xs font-bold text-app-text-secondary hover:text-primary border border-app-border rounded-xl hover:bg-primary/5 transition-all"
              >
                View All Activity
              </button>
            </Card>

            <Card className="p-6 bg-primary text-white border-none shadow-xl shadow-primary/20">
              <div className="size-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <Rocket size={24} />
              </div>
              <h3 className="text-lg font-bold mb-2">Upgrade to Pro</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-6">Get unlimited projects, advanced analytics and custom reporting tools.</p>
              <Button 
                onClick={() => alert('Upgrade to Pro to unlock advanced features!')}
                className="w-full bg-white text-primary hover:bg-white/90 border-none"
              >
                Upgrade Now
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
