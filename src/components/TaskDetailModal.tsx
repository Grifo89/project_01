import { useState, useEffect } from 'preact/hooks';
import { db, Task, Subtask, Comment, User, Priority } from '../services/db';
import { Icon } from './Icon';
import { 
  X, Calendar, Tag, AlertCircle, CheckCircle, 
  MessageSquare, Plus, Trash2, User as UserIcon,
  Clock, ChevronRight, MoreVertical
} from 'lucide-preact';
import { Badge } from './Badge';
import { Avatar } from './Avatar';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

export const TaskDetailModal = ({ task, onClose, onUpdate }: TaskDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [progress, setProgress] = useState(task.progress);
  const [completed, setCompleted] = useState(task.completed);
  
  const [timeSpent, setTimeSpent] = useState(task.timeSpent || 0);
  const [isTimerRunning, setIsTimerRunning] = useState(task.isTimerRunning || false);
  const [timerStartedAt, setTimerStartedAt] = useState(task.timerStartedAt);
  const [elapsedDuringRun, setElapsedDuringRun] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerStartedAt) {
      interval = setInterval(() => {
        const start = new Date(timerStartedAt).getTime();
        const now = new Date().getTime();
        setElapsedDuringRun(Math.floor((now - start) / 1000));
      }, 1000);
    } else {
      setElapsedDuringRun(0);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartedAt]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async () => {
    await db.startTaskTimer(task.id);
    setIsTimerRunning(true);
    setTimerStartedAt(new Date().toISOString());
    onUpdate();
  };

  const handleStopTimer = async () => {
    await db.stopTaskTimer(task.id);
    const updatedTask = (await db.getTasks()).find(t => t.id === task.id);
    if (updatedTask) {
      setTimeSpent(updatedTask.timeSpent || 0);
      setIsTimerRunning(false);
      setTimerStartedAt(undefined);
      setElapsedDuringRun(0);
    }
    onUpdate();
  };

  const handleProgressChange = async (newProgress: number) => {
    setProgress(newProgress);
    await db.updateTask(task.id, { progress: newProgress });
    onUpdate();
  };
  
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  const [team, setTeam] = useState<User[]>([]);
  const [assignee, setAssignee] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [subtasksData, commentsData, teamData, allUsers] = await Promise.all([
        db.getSubtasks(task.id),
        db.getComments(task.id),
        db.getProjectTeam(task.projectId),
        db.getUsers()
      ]);
      setSubtasks(subtasksData);
      setComments(commentsData);
      setTeam(teamData);
      
      if (task.assigneeId) {
        setAssignee(allUsers.find(u => u.id === task.assigneeId) || null);
      }
    };
    fetchData();
  }, [task.id]);

  const handleAssigneeChange = async (userId: string) => {
    const user = team.find(u => u.id === userId) || null;
    setAssignee(user);
    await db.updateTask(task.id, { assigneeId: userId || undefined });
    onUpdate();
  };

  const handleSaveTask = async () => {
    await db.updateTask(task.id, {
      title,
      description,
      priority,
      dueDate,
      progress,
      completed
    });
    setIsEditing(false);
    onUpdate();
  };

  const handleAddSubtask = async (e: Event) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    
    await db.addSubtask({
      taskId: task.id,
      title: newSubtaskTitle,
      completed: false,
      orderIndex: subtasks.length * 1000
    });
    
    setNewSubtaskTitle('');
    const updatedSubtasks = await db.getSubtasks(task.id);
    setSubtasks(updatedSubtasks);
    updateTaskProgress(updatedSubtasks);
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    const newStatus = !subtask.completed;
    await db.updateSubtask(subtask.id, { completed: newStatus });
    const updatedSubtasks = await db.getSubtasks(task.id);
    setSubtasks(updatedSubtasks);
    updateTaskProgress(updatedSubtasks);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await db.deleteSubtask(subtaskId);
    const updatedSubtasks = await db.getSubtasks(task.id);
    setSubtasks(updatedSubtasks);
    updateTaskProgress(updatedSubtasks);
  };

  const updateTaskProgress = async (currentSubtasks: Subtask[]) => {
    if (currentSubtasks.length === 0) return;
    const completedCount = currentSubtasks.filter(s => s.completed).length;
    const newProgress = Math.round((completedCount / currentSubtasks.length) * 100);
    setProgress(newProgress);
    await db.updateTask(task.id, { progress: newProgress });
    onUpdate();
  };

  const handleAddComment = async (e: Event) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    // For now, use a default user if none exists or just pick the first one
    const userId = users[0]?.id || 'u1';
    
    await db.addComment({
      taskId: task.id,
      userId,
      content: newComment
    });
    
    setNewComment('');
    setComments(await db.getComments(task.id));
  };

  const priorityColors = {
    high: 'text-rose-500 bg-rose-50 border-rose-100',
    medium: 'text-amber-500 bg-amber-50 border-amber-100',
    low: 'text-slate-500 bg-slate-50 border-slate-100'
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-app-surface w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-app-border flex items-center justify-between bg-app-surface/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={async () => {
                const newStatus = !completed;
                setCompleted(newStatus);
                await db.updateTask(task.id, { completed: newStatus });
                onUpdate();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${completed ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-app-background text-app-text-secondary border border-app-border hover:border-emerald-500 hover:text-emerald-500'}`}
            >
              <CheckCircle size={18} />
              <span>{completed ? 'Completed' : 'Mark Complete'}</span>
            </button>
            <div className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${priorityColors[priority]}`}>
              {priority} Priority
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-app-text-secondary hover:bg-app-background rounded-xl transition-all">
              <MoreVertical size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-app-text-secondary hover:bg-rose-500 hover:text-white rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Title & Description */}
              <div className="space-y-6">
                {isEditing ? (
                  <input 
                    type="text"
                    value={title}
                    onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
                    className="text-3xl font-bold text-app-text-primary bg-app-background border border-app-border rounded-2xl px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-app-text-primary leading-tight">{title}</h1>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Description</h3>
                    {!isEditing && (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <textarea 
                      value={description}
                      onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
                      className="w-full bg-app-background border border-app-border rounded-2xl p-4 text-app-text-primary min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Add a more detailed description..."
                    />
                  ) : (
                    <p className="text-app-text-secondary leading-relaxed whitespace-pre-wrap">
                      {description || 'No description provided.'}
                    </p>
                  )}
                  {isEditing && (
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          setTitle(task.title);
                          setDescription(task.description || '');
                        }}
                        className="px-4 py-2 text-sm font-bold text-app-text-secondary hover:bg-app-background rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveTask}
                        className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Subtasks</h3>
                    <Badge variant="slate">{subtasks.length}</Badge>
                  </div>
                  <span className="text-xs font-bold text-app-text-secondary">{progress}% Complete</span>
                </div>

                <div className="w-full bg-app-background h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="space-y-3">
                  {subtasks.map(subtask => (
                    <div 
                      key={subtask.id}
                      className="flex items-center gap-4 p-4 bg-app-background/50 border border-app-border rounded-2xl hover:border-primary/30 transition-all group"
                    >
                      <button 
                        onClick={() => handleToggleSubtask(subtask)}
                        className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all ${subtask.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-app-border hover:border-primary'}`}
                      >
                        {subtask.completed && <CheckCircle size={14} />}
                      </button>
                      <span className={`flex-1 text-sm font-medium ${subtask.completed ? 'text-app-text-secondary line-through' : 'text-app-text-primary'}`}>
                        {subtask.title}
                      </span>
                      <button 
                        onClick={() => handleDeleteSubtask(subtask.id)}
                        className="p-1.5 text-app-text-secondary hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <form onSubmit={handleAddSubtask} className="flex gap-2">
                    <input 
                      type="text"
                      value={newSubtaskTitle}
                      onInput={(e) => setNewSubtaskTitle((e.target as HTMLInputElement).value)}
                      placeholder="Add a subtask..."
                      className="flex-1 bg-app-background border border-app-border rounded-2xl px-4 py-3 text-sm text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                    <button 
                      type="submit"
                      className="px-4 py-3 bg-app-surface border border-app-border rounded-2xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                      <Plus size={20} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Comments</h3>
                  <Badge variant="primary">{comments.length}</Badge>
                </div>

                <div className="space-y-6">
                  {comments.map(comment => {
                    const user = users.find(u => u.id === comment.userId);
                    return (
                      <div key={comment.id} className="flex gap-4">
                        <Avatar initials={user?.initials || '??'} size="sm" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-app-text-primary">{user?.name || 'Unknown User'}</span>
                            <span className="text-[10px] text-app-text-secondary font-medium">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="bg-app-background border border-app-border rounded-2xl p-4 text-sm text-app-text-secondary leading-relaxed">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <form onSubmit={handleAddComment} className="flex gap-4">
                    <Avatar initials="ME" size="sm" />
                    <div className="flex-1 space-y-3">
                      <textarea 
                        value={newComment}
                        onInput={(e) => setNewComment((e.target as HTMLTextAreaElement).value)}
                        placeholder="Write a comment..."
                        className="w-full bg-app-background border border-app-border rounded-2xl p-4 text-sm text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[80px]"
                      />
                      <div className="flex justify-end">
                        <button 
                          type="submit"
                          className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                        >
                          Post Comment
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-8">
              <div className="space-y-6 bg-app-background/30 rounded-3xl p-6 border border-app-border">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-app-text-secondary font-medium">
                      <UserIcon size={16} />
                      <span>Assignee</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        value={assignee?.id || ''}
                        onChange={(e) => handleAssigneeChange((e.target as HTMLSelectElement).value)}
                        className="bg-app-background border border-app-border rounded-lg px-2 py-1 text-xs text-app-text-primary focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {team.map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                      {assignee && <Avatar initials={assignee.initials} size="xs" />}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-app-text-secondary font-medium">
                      <Calendar size={16} />
                      <span>Due Date</span>
                    </div>
                    {isEditing ? (
                      <input 
                        type="date"
                        value={dueDate}
                        onInput={(e) => setDueDate((e.target as HTMLInputElement).value)}
                        className="bg-app-background border border-app-border rounded-lg px-2 py-1 text-xs text-app-text-primary"
                      />
                    ) : (
                      <span className="font-bold text-app-text-primary">{dueDate || 'No date'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-app-text-secondary font-medium">
                      <AlertCircle size={16} />
                      <span>Priority</span>
                    </div>
                    {isEditing ? (
                      <select 
                        value={priority}
                        onChange={(e) => setPriority((e.target as HTMLSelectElement).value as Priority)}
                        className="bg-app-background border border-app-border rounded-lg px-2 py-1 text-xs text-app-text-primary"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    ) : (
                      <Badge variant={priority === 'high' ? 'rose' : priority === 'medium' ? 'amber' : 'slate'}>
                        {priority}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-app-text-secondary font-medium">
                      <Tag size={16} />
                      <span>Tag</span>
                    </div>
                    <Badge variant={task.tagVariant as any}>{task.tag}</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-app-border">
                  <div className="flex items-center justify-between text-xs text-app-text-secondary mb-2">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onInput={(e) => handleProgressChange(parseInt((e.target as HTMLInputElement).value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>

              <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-4">
                <div className="flex items-center justify-between text-primary">
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    <h4 className="font-bold text-sm">Time Tracking</h4>
                  </div>
                  <span className="text-sm font-mono font-bold">{formatTime(timeSpent + elapsedDuringRun)}</span>
                </div>
                <p className="text-xs text-app-text-secondary leading-relaxed">
                  Track time spent on this task to improve your team's velocity and planning.
                </p>
                {isTimerRunning ? (
                  <button 
                    onClick={handleStopTimer}
                    className="w-full py-3 bg-rose-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="size-2 bg-white rounded-full animate-pulse"></span>
                    Stop Timer
                  </button>
                ) : (
                  <button 
                    onClick={handleStartTimer}
                    className="w-full py-3 bg-primary text-white rounded-2xl text-xs font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                  >
                    Start Timer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
