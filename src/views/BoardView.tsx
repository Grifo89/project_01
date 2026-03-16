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
  DragEndEvent,
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
import { Plus, MoreHorizontal, Loader2 } from 'lucide-preact';
import { db, Task, Column, Project, ProjectMember } from '../services/db';
import { Modal } from '../components/Modal';
import { ColumnForm } from '../components/ColumnForm';
import { TaskForm } from '../components/TaskForm';
import { TaskDetailModal } from '../components/TaskDetailModal';

const BoardView = ({ currentProject, searchQuery }: { currentProject: Project | null; searchQuery: string }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [activeTab, setActiveTab] = useState('All Tasks');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = async () => {
    if (!currentProject) { setLoading(false); return; }
    try {
      const [colsData, tasksData, membersData] = await Promise.all([
        db.getColumns(currentProject.id),
        db.getTasks(currentProject.id),
        db.getProjectMembers(currentProject.id),   // ← was db.getProjectTeam()
      ]);
      setColumns(colsData);
      setTasks(tasksData);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to fetch board data:', err);
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

    let matchesTab = true;
    if (activeTab === 'Archived') {
      matchesTab = task.isArchived;
    } else {
      matchesTab = !task.isArchived;
    }

    return matchesSearch && matchesPriority && matchesStatus && matchesTab;
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const taskId = active.id as string;
    const overId = over.id as string;
    if (taskId === overId) return;
    const overColumn = columns.find(c => c.id === overId);
    if (overColumn) {
      await db.updateTaskColumn(taskId, overId);
      await fetchData();
      return;
    }
    const overTask = tasks.find(t => t.id === overId);
    const activeTaskObj = tasks.find(t => t.id === taskId);
    if (overTask && activeTaskObj && overTask.columnId !== activeTaskObj.columnId) {
      await db.updateTaskColumn(taskId, overTask.columnId);
      await fetchData();
    }
  };

  const handleAddTask = async (data: any) => {
    if (!currentProject || !activeColumnId) return;
    await db.addTask({ ...data, projectId: currentProject.id, columnId: activeColumnId });
    await fetchData();
    setIsTaskModalOpen(false);
  };

  const handleAddColumn = async (data: { name: string }) => {
    if (!currentProject) return;
    const id = (await import('../services/db')).db;
    // simple inline column add
    const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    const colId = generateId();
    const orderIndex = columns.length * 1000;
    await (db as any).db?.exec?.({ sql: 'INSERT INTO columns (id, project_id, name, order_index) VALUES (?, ?, ?, ?)', bind: [colId, currentProject.id, data.name, orderIndex] });
    await fetchData();
    setIsColumnModalOpen(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  if (!currentProject) return <div className="flex-1 flex flex-col items-center justify-center p-10 text-center"><h2 className="text-2xl font-bold">No Project Selected</h2></div>;

  const getTasksByColumn = (columnId: string) => filteredTasks.filter(t => t.columnId === columnId);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-app-background">
      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-app-text-primary">{currentProject.name}</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsColumnModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg"><Plus size={18} /> Add Column</button>
          </div>
        </div>
        <div className="flex items-center gap-6 border-b border-app-border">
          {['All Tasks', 'Archived'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-bold transition-all relative ${activeTab === tab ? 'text-primary' : 'text-app-text-secondary hover:text-app-text-primary'}`}>
              {tab} {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        onDragStart={(e) => setActiveTask(tasks.find(t => t.id === e.active.id) || null)}
      >
        <div className="flex-1 overflow-x-auto px-6 lg:px-10 pb-10">
          <div className="flex gap-8 h-full min-h-[500px]">
            {columns.map(column => (
              <KanbanColumn key={column.id} id={column.id} title={column.name} count={getTasksByColumn(column.id).length} color="bg-primary">
                <SortableContext items={getTasksByColumn(column.id).map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {getTasksByColumn(column.id).map(task => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      members={members}
                      onClick={() => setSelectedTask(task)}
                      onDelete={async () => { await db.deleteTask(task.id); fetchData(); }}
                      onArchive={async () => { await db.updateTask(task.id, { isArchived: true }); fetchData(); }}
                    />
                  ))}
                </SortableContext>
                <button onClick={() => { setActiveColumnId(column.id); setIsTaskModalOpen(true); }} className="w-full py-3 border-2 border-dashed border-app-border rounded-2xl text-app-text-secondary text-sm font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"><Plus size={18} /> Add Task</button>
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
                assignees={activeTask.assigneeIds?.map(authUid => {
                  const m = members.find(member => member.authUid === authUid);
                  return m ? { displayName: m.displayName, photoUrl: m.photoUrl ?? undefined } : null;
                }).filter(Boolean) as any[]}
                dueDate={activeTask.dueDate}
                completed={activeTask.completed}
                priority={activeTask.priority}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal isOpen={isColumnModalOpen} onClose={() => setIsColumnModalOpen(false)} title="Add Column">
        <ColumnForm onSubmit={handleAddColumn} onCancel={() => setIsColumnModalOpen(false)} />
      </Modal>
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Create New Task">
        <TaskForm users={members} onSubmit={handleAddTask} onCancel={() => setIsTaskModalOpen(false)} />
      </Modal>
      {selectedTask && (
        <TaskDetailModal
          task={tasks.find(t => t.id === selectedTask.id) || selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
};

const SortableTaskCard = ({
  task,
  members,
  onClick,
  onDelete,
  onArchive,
}: {
  task: Task;
  members: ProjectMember[];
  onClick: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 0
  };

  const assignees = task.assigneeIds?.map(authUid => {
    const m = members.find(member => member.authUid === authUid);
    return m ? { displayName: m.displayName, photoUrl: m.photoUrl ?? undefined } : null;
  }).filter(Boolean) as { displayName: string; photoUrl?: string }[];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(attributes as any)}
      {...(listeners as any)}
      className="relative group outline-none"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button')) {
          onClick();
        }
      }}
    >
      <TaskCard
        id={task.id}
        title={task.title}
        tag={task.tag || ''}
        tagVariant={task.tagVariant as any}
        progress={task.progress}
        assignees={assignees}
        dueDate={task.dueDate}
        completed={task.completed}
        priority={task.priority}
        onDelete={onDelete}
        onArchive={onArchive}
      />
      <div className="absolute top-3 right-10 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none">
        <MoreHorizontal size={14} />
      </div>
    </div>
  );
};

export default BoardView;
