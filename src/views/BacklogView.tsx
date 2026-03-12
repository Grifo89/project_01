import { useState, useEffect } from 'preact/hooks';
import { db, Task, Project, User, Priority } from '../services/db';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { Search, Filter, Loader2, Inbox, ChevronDown } from 'lucide-preact';

export const BacklogView = ({ currentProject }: { currentProject: Project | null }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  const fetchData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [tasksData, usersData] = await Promise.all([
        db.getTasks(currentProject.id),
        db.getProjectTeam(currentProject.id)
      ]);
      // Backlog tasks are unassigned OR manually marked as backlog (if we had a field)
      // Here we define backlog as unassigned tasks
      setTasks(tasksData.filter(t => (!t.assigneeIds || t.assigneeIds.length === 0) && !t.isArchived));
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch backlog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [currentProject]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && !task.completed) || 
                         (filterStatus === 'completed' && task.completed);
    return matchesSearch && matchesPriority && matchesStatus;
  });

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="flex-1 px-6 lg:px-10 py-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-app-text-primary">Backlog</h1>
            <p className="text-app-text-secondary text-sm mt-1">Unassigned tasks waiting for team members.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-secondary" size={16} />
              <input type="text" value={searchQuery} onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)} placeholder="Search..." className="pl-10 pr-4 py-2 bg-app-surface border border-app-border rounded-xl text-sm w-64" />
            </div>
            
            <select value={filterPriority} onChange={(e) => setFilterPriority((e.target as HTMLSelectElement).value as any)} className="bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer">
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus((e.target as HTMLSelectElement).value as any)} className="bg-app-surface border border-app-border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTasks.map(task => (
            <TaskCard key={task.id} title={task.title} tag={task.tag || ''} tagVariant={task.tagVariant as any} dueDate={task.dueDate} progress={task.progress} completed={task.completed} priority={task.priority} assignees={[]} onClick={() => setSelectedTask(task)} />
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-app-surface/50 rounded-[40px] border-2 border-dashed border-app-border">
            <Inbox size={40} className="text-app-text-secondary mb-4" />
            <h2 className="text-xl font-bold">Backlog is empty</h2>
          </div>
        )}
      </div>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => { setSelectedTask(null); fetchData(); }} onUpdate={fetchData} />}
    </div>
  );
};
