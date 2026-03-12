import { useState, useEffect } from 'preact/hooks';
import { db, Task, Project, User } from '../services/db';
import { Card } from '../components/Card';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { Plus, Search, Filter, Loader2, Inbox } from 'lucide-preact';

export const BacklogView = ({ currentProject }: { currentProject: Project | null }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [tasksData, usersData] = await Promise.all([
        db.getTasks(currentProject.id),
        db.getUsers()
      ]);
      // Backlog tasks are those not assigned to a sprint OR not assigned to any team member
      setTasks(tasksData.filter(t => (!t.sprintId || !t.assigneeId) && !t.isArchived));
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch backlog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentProject]);

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 lg:px-10 py-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-app-text-primary">Backlog</h1>
            <p className="text-app-text-secondary text-sm mt-1">Tasks waiting to be assigned to a sprint.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-app-text-secondary" size={16} />
              <input 
                type="text"
                value={searchQuery}
                onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                placeholder="Search backlog..."
                className="pl-10 pr-4 py-2 bg-app-surface border border-app-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-64"
              />
            </div>
            <button 
              onClick={() => alert('Filter feature coming soon!')}
              className="flex items-center gap-2 px-4 py-2 bg-app-surface border border-app-border rounded-xl text-sm font-bold text-app-text-secondary hover:bg-app-border transition-all"
            >
              <Filter size={16} />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTasks.map(task => {
            const assignee = users.find(u => u.id === task.assigneeId);
            return (
              <TaskCard 
                key={task.id} 
                title={task.title}
                tag={task.tag || ''}
                tagVariant={task.tagVariant as any}
                dueDate={task.dueDate}
                progress={task.progress}
                completed={task.completed}
                priority={task.priority}
                assignees={assignee ? [{ initials: assignee.initials, src: assignee.avatarUrl }] : []}
                onClick={() => setSelectedTask(task)}
              />
            );
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-app-surface/50 rounded-[40px] border-2 border-dashed border-app-border">
            <div className="size-20 bg-app-background rounded-full flex items-center justify-center mb-6">
              <Inbox size={40} className="text-app-text-secondary" />
            </div>
            <h2 className="text-xl font-bold text-app-text-primary mb-2">Backlog is empty</h2>
            <p className="text-app-text-secondary max-w-sm">
              All tasks are currently assigned to sprints or there are no tasks in this project.
            </p>
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            fetchData();
          }}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};
