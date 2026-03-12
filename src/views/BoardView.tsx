import { useState, useEffect } from 'preact/hooks';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskCard } from '../components/TaskCard';
import { Icon } from '../components/Icon';
import { Plus, Filter, Search, ChevronDown, MoreHorizontal, Settings, Users, Loader2, Layout } from 'lucide-preact';
import { db, Task, Column, Project, Priority } from '../services/db';
import { Modal } from '../components/Modal';
import { ColumnForm } from '../components/ColumnForm';
import { TaskForm } from '../components/TaskForm';
import { TaskDetailModal } from '../components/TaskDetailModal';

const BoardView = ({ currentProject, searchQuery }: { currentProject: Project | null, searchQuery: string }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  const [activeTab, setActiveTab] = useState('All Tasks');

  const calculateSprint = (project: Project | null) => {
    if (!project || !project.startDate) return 'No Sprint';
    const start = new Date(project.startDate).getTime();
    const now = new Date().getTime();
    const durationWeeks = project.sprintDurationWeeks || 2;
    const durationMs = durationWeeks * 7 * 24 * 60 * 60 * 1000;
    const diff = now - start;
    if (diff < 0) return 'Planned';
    return `Sprint ${Math.floor(diff / durationMs) + 1}`;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = async () => {
    if (!currentProject) {
      setLoading(false);
      return;
    }
    
    try {
      const [colsData, tasksData, usersData] = await Promise.all([
        db.getColumns(currentProject.id),
        db.getTasks(currentProject.id),
        db.getUsers()
      ]);
      
      setColumns(colsData);
      setTasks(tasksData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentProject]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && !task.completed) || 
                         (filterStatus === 'completed' && task.completed);
    
    // Only assigned tasks appear on the board (All, My, Team, Recent)
    // Unassigned tasks only appear in the BACKLOG (which uses its own view or we'd need a tab here)
    // For now, let's assume "All Tasks" on board means "All ASSIGNED Tasks"
    
    if (activeTab === 'Archived') {
      return matchesSearch && matchesPriority && matchesStatus && task.isArchived;
    }

    // Hide archived tasks from non-archive tabs
    if (task.isArchived) return false;

    let matchesTab = true;
    if (activeTab === 'My Tasks') {
      // My Tasks: tasks with NO teammates assigned (owner is solo user)
      matchesTab = !task.assigneeId;
    } else if (activeTab === 'Team Tasks') {
      // Team Tasks: tasks with someone assigned
      matchesTab = !!task.assigneeId;
    } else if (activeTab === 'Recent') {
      // Recent: activity (updated_at) in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      matchesTab = (task.updatedAt || task.createdAt) >= sevenDaysAgo;
    } else if (activeTab === 'All Tasks') {
      // REQUIRE assignment to show on board? 
      // User said: "unnasigned task should only appears in the backlog and only if the task is assign should appear in the tasks view"
      matchesTab = !!task.assigneeId;
    }
    
    return matchesSearch && matchesPriority && matchesStatus && matchesTab;
  });

  const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, '_');

  // Use 'filteredTasks' instead of 'tasks' here for filtering logic
  const getTasksByColumn = (columnId: string) => filteredTasks
    .filter(t => t.columnId === columnId);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find(t => t.id === overId);
    const overColumn = columns.find(c => c.id === overId);
    const targetColumnId = overColumn ? overColumn.id : (overTask ? overTask.columnId : null);

    if (!targetColumnId) return;

    // Only update state if moving to a DIFFERENT column to avoid heavy re-renders
    if (activeTask.columnId !== targetColumnId) {
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        if (activeIndex === -1) return prev;

        const newTasks = [...prev];
        newTasks[activeIndex] = { ...activeTask, columnId: targetColumnId };
        
        // Find best position in global array for the move
        let overIndex: number;
        if (overTask) {
          overIndex = prev.findIndex(t => t.id === overId);
        } else {
          const colTasks = prev.filter(t => t.columnId === targetColumnId);
          overIndex = colTasks.length > 0 
            ? prev.findIndex(t => t.id === colTasks[colTasks.length - 1].id) + 1
            : prev.length;
        }

        return arrayMove(newTasks, activeIndex, overIndex);
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIndex = tasks.findIndex((t) => t.id === activeId);
    const overIndex = tasks.findIndex((t) => t.id === overId);
    
    if (activeIndex === -1) return;

    const activeTask = tasks[activeIndex];
    const overTask = tasks.find(t => t.id === overId);
    const overColumn = columns.find(c => c.id === overId);
    const targetColumnId = overColumn ? overColumn.id : (overTask ? overTask.columnId : null);

    if (!targetColumnId) return;

    // Local state update for immediate feedback
    let updatedTasks = [...tasks];
    if (activeId !== overId && overIndex !== -1) {
      updatedTasks = arrayMove(tasks, activeIndex, overIndex);
    }
    
    const finalTasks = updatedTasks.map(t => 
      t.id === activeId ? { ...t, columnId: targetColumnId } : t
    );
    
    setTasks(finalTasks);

    try {
      // Calculate a stable orderIndex based on neighbors
      const columnTasks = finalTasks.filter(t => t.columnId === targetColumnId);
      const taskIndexInCol = columnTasks.findIndex(t => t.id === activeId);
      
      let newOrderIndex: number;
      const prevTask = columnTasks[taskIndexInCol - 1];
      const nextTask = columnTasks[taskIndexInCol + 1];

      if (prevTask && nextTask) {
        newOrderIndex = (prevTask.orderIndex + nextTask.orderIndex) / 2;
      } else if (prevTask) {
        newOrderIndex = prevTask.orderIndex + 1000;
      } else if (nextTask) {
        newOrderIndex = nextTask.orderIndex / 2;
      } else {
        newOrderIndex = 1000;
      }

      await db.updateTask(activeId, { 
        columnId: targetColumnId,
        orderIndex: newOrderIndex 
      });

      if (currentProject) {
        const targetColumn = columns.find(c => c.id === targetColumnId);
        await db.addActivity({
          projectId: currentProject.id,
          type: 'task_moved',
          content: `moved task "${activeTask.title}" to ${targetColumn?.name || 'another column'}`
        });
      }
    } catch (e) {
      console.error('Failed to persist drag end:', e);
      fetchData();
    }
  };

  const handleStartTimer = async (taskId: string) => {
    await db.startTaskTimer(taskId);
    fetchData();
  };

  const handleStopTimer = async (taskId: string) => {
    await db.stopTaskTimer(taskId);
    fetchData();
  };

  const handleArchiveTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await db.updateTask(taskId, { isArchived: !task.isArchived });
    fetchData();
  };

  const handleAddColumn = async (data: { name: string }) => {
    if (!currentProject) return;
    await db.addColumn({
      projectId: currentProject.id,
      name: data.name,
      orderIndex: columns.length * 1000
    });
    fetchData();
    setIsColumnModalOpen(false);
  };

  const handleAddTask = async (data: { title: string; description: string; tag: string; tagVariant: string; dueDate: string; priority: Priority; assigneeId?: string }) => {
    if (!currentProject || !activeColumnId) return;

    const newTask: Omit<Task, 'id' | 'createdAt'> = {
      projectId: currentProject.id,
      columnId: data.columnId || activeColumnId || columns[0].id,
      title: data.title,
      description: data.description,
      tag: data.tag,
      tagVariant: data.tagVariant,
      dueDate: data.dueDate,
      priority: data.priority,
      progress: 0,
      completed: false,
      isArchived: false,
      orderIndex: 0,
      assigneeId: data.assigneeId
    };
    await db.addTask(newTask);
    fetchData();
    setIsTaskModalOpen(false);
    setActiveColumnId(null);
  };

  const handleDeleteColumn = async (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column && !column.isDeletable) {
      alert("This is a default column and cannot be deleted.");
      return;
    }
    if (confirm('Are you sure you want to delete this column and all its tasks?')) {
      await db.deleteColumn(columnId);
      fetchData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await db.deleteTask(taskId);
      fetchData();
    }
  };

  const handleTaskUpdate = () => {
    fetchData();
  };

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
          It looks like you haven't created any projects yet. Create your first project to start tracking tasks.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-app-background">
      {/* Board Header */}
      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-app-text-primary">{currentProject.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-app-text-secondary">
              <span className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-emerald-500"></div>
                {calculateSprint(currentProject)}
              </span>
              <span>•</span>
              <span className="font-medium">Active</span>
              <span>•</span>
              <span>{tasks.filter(t => !t.completed && !t.isArchived).length} tasks remaining</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-app-surface border border-app-border rounded-2xl px-3 py-1">
              <Filter size={14} className="text-app-text-secondary" />
              <select 
                value={filterPriority}
                onChange={(e) => setFilterPriority((e.target as HTMLSelectElement).value as any)}
                className="bg-transparent text-xs font-bold text-app-text-primary focus:outline-none appearance-none cursor-pointer pr-4"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-app-surface border border-app-border rounded-2xl px-3 py-1">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus((e.target as HTMLSelectElement).value as any)}
                className="bg-transparent text-xs font-bold text-app-text-primary focus:outline-none appearance-none cursor-pointer pr-4"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <button 
              onClick={() => setIsColumnModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
            >
              <Plus size={18} />
              <span>Add Column</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 border-b border-app-border">
          {['All Tasks', 'My Tasks', 'Team Tasks', 'Recent', 'Archived'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-bold transition-all relative ${activeTab === tab ? 'text-primary' : 'text-app-text-secondary hover:text-app-text-primary'}`}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board or Archive List */}
      {activeTab === 'Archived' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 lg:px-10 pb-10">
          <div className="max-w-7xl mx-auto space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-app-text-primary">Archived Tasks</h2>
              <span className="text-sm text-app-text-secondary font-medium">{filteredTasks.length} tasks</span>
            </div>
            {filteredTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map(task => (
                  <TaskCard 
                    key={task.id}
                    id={task.id}
                    title={task.title} 
                    tag={task.tag || ''} 
                    tagVariant={task.tagVariant as any}
                    progress={task.progress}
                    dueDate={task.dueDate}
                    completed={task.completed}
                    priority={task.priority}
                    timeSpent={task.timeSpent}
                    onDelete={() => handleDeleteTask(task.id)}
                    onArchive={() => handleArchiveTask(task.id)}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-app-surface/50 rounded-3xl border-2 border-dashed border-app-border">
                <p className="text-app-text-secondary">No archived tasks found.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto custom-scrollbar px-6 lg:px-10 pb-10">
            <div className="flex gap-8 h-full min-h-[500px]">
              {columns.map((column, idx) => (
                <KanbanColumn 
                  key={column.id} 
                  id={column.id}
                  title={column.name} 
                  count={getTasksByColumn(column.id).length} 
                  color={idx === 0 ? "bg-slate-400" : idx === 1 ? "bg-primary" : idx === 2 ? "bg-amber-500" : "bg-emerald-500"}
                  onDelete={column.isDeletable ? () => handleDeleteColumn(column.id) : undefined}
                >
                  <SortableContext
                    items={getTasksByColumn(column.id).map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {getTasksByColumn(column.id).map(task => {
                      const assignee = users.find(u => u.id === task.assigneeId);
                      return (
                        <SortableTaskCard 
                          key={task.id}
                          task={task}
                          assignee={assignee}
                          onDelete={() => handleDeleteTask(task.id)}
                          onArchive={() => handleArchiveTask(task.id)}
                          onStartTimer={() => handleStartTimer(task.id)}
                          onStopTimer={() => handleStopTimer(task.id)}
                          onClick={() => setSelectedTask(task)}
                        />
                      );
                    })}
                  </SortableContext>
                  <button 
                    onClick={() => {
                      setActiveColumnId(column.id);
                      setIsTaskModalOpen(true);
                    }}
                    className="w-full py-3 border-2 border-dashed border-app-border rounded-2xl text-app-text-secondary text-sm font-bold hover:bg-primary/5 hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    <span>Add Task</span>
                  </button>
                </KanbanColumn>
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-80 rotate-3 scale-105 pointer-events-none">
                <TaskCard 
                  title={activeTask.title} 
                  tag={activeTask.tag || ''} 
                  tagVariant={activeTask.tagVariant as any}
                  progress={activeTask.progress}
                  assignees={users.find(u => u.id === activeTask.assigneeId) ? [{ initials: users.find(u => u.id === activeTask.assigneeId)!.initials, src: users.find(u => u.id === activeTask.assigneeId)!.avatarUrl }] : []}
                  dueDate={activeTask.dueDate}
                  completed={activeTask.completed}
                  priority={activeTask.priority}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Modal 
        isOpen={isColumnModalOpen} 
        onClose={() => setIsColumnModalOpen(false)} 
        title="Add New Column"
      >
        <ColumnForm 
          onSubmit={handleAddColumn} 
          onCancel={() => setIsColumnModalOpen(false)} 
        />
      </Modal>

      <Modal 
        isOpen={isTaskModalOpen} 
        onClose={() => {
          setIsTaskModalOpen(false);
          setActiveColumnId(null);
        }} 
        title="Create New Task"
      >
        <TaskForm 
          users={users}
          onSubmit={handleAddTask} 
          onCancel={() => {
            setIsTaskModalOpen(false);
            setActiveColumnId(null);
          }} 
        />
      </Modal>

      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
};

const SortableTaskCard = ({ 
  task, assignee, onDelete, onArchive, onStartTimer, onStopTimer, onClick 
}: { 
  task: Task, assignee?: User, onDelete: () => void, onArchive: () => void, onStartTimer: () => void, onStopTimer: () => void, onClick: () => void 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...(attributes as any)} {...(listeners as any)}>
      <TaskCard 
        id={task.id}
        title={task.title} 
        tag={task.tag || ''} 
        tagVariant={task.tagVariant as any}
        progress={task.progress}
        assignees={assignee ? [{ initials: assignee.initials, src: assignee.avatarUrl }] : []}
        dueDate={task.dueDate}
        completed={task.completed}
        priority={task.priority}
        timeSpent={task.timeSpent}
        isTimerRunning={task.isTimerRunning}
        timerStartedAt={task.timerStartedAt}
        onDelete={onDelete}
        onArchive={onArchive}
        onStartTimer={onStartTimer}
        onStopTimer={onStopTimer}
        onClick={onClick}
      />
    </div>
  );
};

export default BoardView;
