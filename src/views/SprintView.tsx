import { useState, useEffect } from 'preact/hooks';
import { db, Sprint, Project, Task } from '../services/db';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Plus, Calendar, Clock, ChevronRight, Loader2, Play, CheckCircle2 } from 'lucide-preact';
import { Modal } from '../components/Modal';

export const SprintView = ({ currentProject }: { currentProject: Project | null }) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const fetchData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [sprintsData, tasksData] = await Promise.all([
        db.getSprints(currentProject.id),
        db.getTasks(currentProject.id)
      ]);
      setSprints(sprintsData);
      setTasks(tasksData);
    } catch (err) {
      console.error('Failed to fetch sprints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentProject]);

  const handleCreateSprint = async (e: Event) => {
    e.preventDefault();
    if (!currentProject || !newName.trim()) return;
    
    await db.addSprint({
      projectId: currentProject.id,
      name: newName,
      startDate: newStartDate,
      endDate: newEndDate,
      status: 'planned'
    });
    
    setNewName('');
    setNewStartDate('');
    setNewEndDate('');
    setIsAddModalOpen(false);
    fetchData();
  };

  const getSprintTasks = (sprintId: string) => {
    return tasks.filter(t => t.sprintId === sprintId);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-app-text-primary">Sprints</h1>
            <p className="text-app-text-secondary text-sm mt-1">Plan and manage your project iterations.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          >
            <Plus size={18} />
            <span>New Sprint</span>
          </button>
        </div>

        <div className="grid gap-6">
          {sprints.map(sprint => {
            const sprintTasks = getSprintTasks(sprint.id);
            const completedTasks = sprintTasks.filter(t => t.completed).length;
            const progress = sprintTasks.length > 0 ? (completedTasks / sprintTasks.length) * 100 : 0;

            return (
              <Card key={sprint.id} className="p-6 hover:shadow-lg transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className={`size-12 rounded-2xl flex items-center justify-center ${sprint.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-app-background text-app-text-secondary'}`}>
                      {sprint.status === 'active' ? <Play size={24} /> : <Calendar size={24} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-app-text-primary">{sprint.name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-xs text-app-text-secondary">
                          <Clock size={14} />
                          <span>{sprint.startDate} - {sprint.endDate}</span>
                        </div>
                        <Badge variant={sprint.status === 'active' ? 'primary' : sprint.status === 'completed' ? 'emerald' : 'slate'}>
                          {sprint.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 max-w-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-app-text-secondary uppercase tracking-wider">Progress</span>
                      <span className="text-xs font-bold text-app-text-primary">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-app-background rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-app-text-secondary mt-2">
                      {completedTasks} of {sprintTasks.length} tasks completed
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => alert(`Viewing details for ${sprint.name}`)}
                      className="p-3 text-app-text-secondary hover:bg-app-background rounded-xl transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

          {sprints.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-app-surface/50 rounded-[40px] border-2 border-dashed border-app-border">
              <div className="size-20 bg-app-background rounded-full flex items-center justify-center mb-6">
                <Calendar size={40} className="text-app-text-secondary" />
              </div>
              <h2 className="text-xl font-bold text-app-text-primary mb-2">No sprints planned</h2>
              <p className="text-app-text-secondary max-w-sm mb-8">
                Break your project into manageable time-boxed iterations to track progress more effectively.
              </p>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              >
                Create First Sprint
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Create New Sprint"
      >
        <form onSubmit={handleCreateSprint} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Sprint Name</label>
            <input 
              autoFocus
              type="text"
              value={newName}
              onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
              placeholder="e.g. Sprint 1 - Core Features"
              className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Start Date</label>
              <input 
                type="date"
                value={newStartDate}
                onInput={(e) => setNewStartDate((e.target as HTMLInputElement).value)}
                className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">End Date</label>
              <input 
                type="date"
                value={newEndDate}
                onInput={(e) => setNewEndDate((e.target as HTMLInputElement).value)}
                className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 px-4 py-3 bg-app-background border border-app-border rounded-2xl text-sm font-bold text-app-text-secondary hover:bg-app-border transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-3 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              Create Sprint
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
