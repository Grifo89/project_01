import { useState, useEffect } from 'preact/hooks';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, Plus, Loader2 } from 'lucide-preact';
import { db, Task, Project, Priority } from '../services/db';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { TaskForm } from '../components/TaskForm';

export const CalendarView = ({ currentProject }: { currentProject: Project | null }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const fetchData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const tasksData = await db.getTasks(currentProject.id);
      setTasks(tasksData);
    } catch (err) {
      console.error('Failed to fetch calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentProject]);

  const handleAddTask = async (data: { title: string; description: string; tag: string; tagVariant: string; dueDate: string; priority: Priority }) => {
    if (!currentProject) return;
    
    // Get first column as default
    const columns = await db.getColumns(currentProject.id);
    if (columns.length === 0) return;

    const myUserId = localStorage.getItem('myUserId');

    const newTask: Omit<Task, 'id' | 'createdAt'> = {
      projectId: currentProject.id,
      columnId: columns[0].id,
      title: data.title,
      description: data.description,
      tag: data.tag,
      tagVariant: data.tagVariant,
      dueDate: data.dueDate || (selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : ''),
      priority: data.priority,
      progress: 0,
      completed: false,
      isArchived: false,
      orderIndex: 0,
      assigneeId: myUserId || undefined
    };
    await db.addTask(newTask);
    fetchData();
    setIsTaskModalOpen(false);
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const prev = new Date(currentDate);
      prev.setDate(currentDate.getDate() - 7);
      setCurrentDate(prev);
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const next = new Date(currentDate);
      next.setDate(currentDate.getDate() + 7);
      setCurrentDate(next);
    }
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Week view calculations
  const getStartOfWeek = (date: Date) => {
    const diff = date.getDate() - date.getDay();
    return new Date(date.getFullYear(), date.getMonth(), diff);
  };

  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const getTasksForSpecificDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return tasks.filter(t => t.dueDate === dateStr);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  if (loading) {
// ... (rest of loading check)
  }

  const selectedDateTasks = selectedDate ? getTasksForSpecificDate(selectedDate) : [];

  return (
    <div className="flex-1 px-6 lg:px-10 py-6 overflow-y-auto custom-scrollbar pb-24 bg-app-background">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-app-text-primary">Calendar</h1>
          <p className="text-app-text-secondary mt-1">Schedule and track your project deadlines</p>
        </div>
        <div className="flex items-center gap-2 bg-app-surface border border-app-border rounded-2xl p-1">
          <button 
            onClick={() => setViewMode('month')}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${viewMode === 'month' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-app-text-secondary hover:text-app-text-primary'}`}
          >
            Month
          </button>
          <button 
            onClick={() => setViewMode('week')}
            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${viewMode === 'week' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-app-text-secondary hover:text-app-text-primary'}`}
          >
            Week
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <Card className="xl:col-span-2 p-6 border-app-border bg-app-surface shadow-xl shadow-black/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-app-text-primary">
              {viewMode === 'month' ? `${monthName} ${year}` : `Week of ${weekDays[0].toLocaleDateString('default', { month: 'short', day: 'numeric' })}`}
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={prevPeriod}
                className="size-10 flex items-center justify-center rounded-xl border border-app-border hover:bg-app-background transition-colors text-app-text-secondary hover:text-primary"
              >
                <Icon icon={ChevronLeft} size={20} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-bold border border-app-border rounded-xl hover:bg-app-background transition-colors text-app-text-primary"
              >
                Today
              </button>
              <button 
                onClick={nextPeriod}
                className="size-10 flex items-center justify-center rounded-xl border border-app-border hover:bg-app-background transition-colors text-app-text-secondary hover:text-primary"
              >
                <Icon icon={ChevronRight} size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-4">
            {days.map(day => (
              <div key={day} className="text-center py-2">
                <span className="text-xs font-bold text-app-text-secondary uppercase tracking-widest">{day}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-app-border border border-app-border rounded-2xl overflow-hidden shadow-inner">
            {viewMode === 'month' ? (
              <>
                {Array.from({ length: firstDayOfMonth(year, month) }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 lg:h-32 bg-app-surface/50 opacity-30"></div>
                ))}
                {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(year, month, day);
                  const dateTasks = getTasksForSpecificDate(date);
                  const today = isSameDay(new Date(), date);
                  const selected = selectedDate && isSameDay(selectedDate, date);

                  return (
                    <button 
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`h-24 lg:h-32 p-2 bg-app-surface hover:bg-primary/5 transition-all flex flex-col items-start gap-1 relative group ${selected ? 'ring-2 ring-inset ring-primary z-10' : ''}`}
                    >
                      <span className={`size-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${today ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-app-text-primary group-hover:text-primary'}`}>
                        {day}
                      </span>
                      <div className="w-full flex flex-col gap-1 mt-1 overflow-hidden">
                        {dateTasks.slice(0, 2).map(task => (
                          <div key={task.id} className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium border ${task.priority === 'high' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                            {task.title}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              weekDays.map((date, i) => {
                const dateTasks = getTasksForSpecificDate(date);
                const today = isSameDay(new Date(), date);
                const selected = selectedDate && isSameDay(selectedDate, date);

                return (
                  <button 
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`h-48 lg:h-64 p-2 bg-app-surface hover:bg-primary/5 transition-all flex flex-col items-start gap-1 relative group ${selected ? 'ring-2 ring-inset ring-primary z-10' : ''}`}
                  >
                    <span className={`size-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${today ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-app-text-primary group-hover:text-primary'}`}>
                      {date.getDate()}
                    </span>
                    <div className="w-full flex flex-col gap-1 mt-1 overflow-hidden">
                      {dateTasks.map(task => (
                        <div key={task.id} className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium border ${task.priority === 'high' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                          {task.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-app-text-primary">
              {selectedDate?.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
            </h3>
            <Badge variant="indigo">{selectedDateTasks.length} Tasks</Badge>
          </div>

          <div className="space-y-4">
            {selectedDateTasks.length > 0 ? (
              selectedDateTasks.map(task => (
                <Card key={task.id} className="p-4 border-app-border bg-app-surface hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`size-2 rounded-full ${
                          task.priority === 'high' ? 'bg-rose-500' :
                          task.priority === 'medium' ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-app-text-secondary">{task.tag}</span>
                      </div>
                      <h4 className="font-bold text-app-text-primary group-hover:text-primary transition-colors">{task.title}</h4>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex -space-x-2">
                          <div className="size-6 rounded-full bg-primary/20 border-2 border-app-surface flex items-center justify-center text-[10px] font-bold text-primary">JD</div>
                        </div>
                        <span className="text-[10px] font-medium text-app-text-secondary flex items-center gap-1">
                          <Clock size={10} /> 10:00 AM
                        </span>
                      </div>
                    </div>
                    <button className="text-app-text-secondary hover:text-primary transition-colors">
                      <Plus size={18} />
                    </button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-app-border rounded-3xl">
                <div className="size-12 bg-app-surface rounded-full flex items-center justify-center mb-4">
                  <CalendarIcon size={24} className="text-app-text-secondary" />
                </div>
                <p className="text-sm font-bold text-app-text-primary">No tasks scheduled</p>
                <p className="text-xs text-app-text-secondary mt-1">Enjoy your free time!</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsTaskModalOpen(true)}
            className="w-full py-4 bg-app-surface border border-app-border rounded-2xl text-app-text-primary font-bold hover:bg-primary/5 hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            <span>Schedule New Task</span>
          </button>
        </div>
      </div>

      <Modal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        title="Schedule New Task"
      >
        <TaskForm 
          onSubmit={handleAddTask} 
          onCancel={() => setIsTaskModalOpen(false)} 
          initialData={{
            dueDate: selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : ''
          }}
        />
      </Modal>
    </div>
  );
};
