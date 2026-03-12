import { useState, useEffect } from 'preact/hooks';
import { db, Task, User, Priority } from '../services/db';
import { Icon } from './Icon';
import { 
  X, Calendar, Tag, AlertCircle, CheckCircle, 
  MessageSquare, Plus, Trash2, User as UserIcon,
  Clock, MoreVertical, ChevronRight, Play, Square
} from 'lucide-preact';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { Modal } from './Modal';

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

  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [isAddSubtaskModalOpen, setIsAddSubtaskModalOpen] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  const [comments, setComments] = useState<any[]>([]);
  const [isAddCommentModalOpen, setIsAddCommentModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  
  const [team, setTeam] = useState<User[]>([]);
  const [isAddAssigneeModalOpen, setIsAddAssigneeModalOpen] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds || []);

  // Sync state ONLY when switching tasks (different ID)
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDueDate(task.dueDate || '');
    setProgress(task.progress);
    setCompleted(task.completed);
    setAssigneeIds(task.assigneeIds || []);
    setTimeSpent(task.timeSpent || 0);
    setIsTimerRunning(task.isTimerRunning || false);
    setTimerStartedAt(task.timerStartedAt);
  }, [task.id]);

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

  const fetchData = async () => {
    try {
      const [subtasksData, commentsData, teamData] = await Promise.all([
        db.getSubtasks(task.id),
        db.getComments(task.id),
        db.getProjectTeam(task.projectId)
      ]);
      setSubtasks(subtasksData);
      setComments(commentsData);
      setTeam(teamData);
    } catch (e) {
      console.error('Failed to fetch task details:', e);
    }
  };

  useEffect(() => { fetchData(); }, [task.id]);

  const handleToggleAssignee = async (userId: string) => {
    const isAssigned = assigneeIds.includes(userId);
    const newIds = isAssigned 
      ? assigneeIds.filter(id => id !== userId)
      : [...assigneeIds, userId];
    
    setAssigneeIds(newIds);
    await db.updateTask(task.id, { assigneeIds: newIds });
    onUpdate();
  };

  const handleSaveTask = async () => {
    await db.updateTask(task.id, { title, description, priority, dueDate, progress, completed });
    setIsEditing(false);
    onUpdate();
  };

  const handleToggleSubtask = async (subtask: any) => {
    const newStatus = !subtask.completed;
    await db.updateSubtask(subtask.id, newStatus);
    const updatedSubtasks = await db.getSubtasks(task.id);
    setSubtasks(updatedSubtasks);
    
    if (updatedSubtasks.length > 0) {
      const completedCount = updatedSubtasks.filter(s => s.completed).length;
      const newProgress = Math.round((completedCount / updatedSubtasks.length) * 100);
      setProgress(newProgress);
      await db.updateTask(task.id, { progress: newProgress });
    }
    onUpdate();
  };

  const handleAddSubtask = async (e: Event) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    await db.addSubtask(task.id, newSubtaskTitle);
    setNewSubtaskTitle('');
    setIsAddSubtaskModalOpen(false);
    
    const updatedSubtasks = await db.getSubtasks(task.id);
    setSubtasks(updatedSubtasks);
    
    const completedCount = updatedSubtasks.filter(s => s.completed).length;
    const newProgress = Math.round((completedCount / updatedSubtasks.length) * 100);
    setProgress(newProgress);
    await db.updateTask(task.id, { progress: newProgress });
    onUpdate();
  };

  const handleDeleteSubtask = async (id: string) => {
    await db.deleteSubtask(id);
    const updatedSubtasks = await db.getSubtasks(task.id);
    setSubtasks(updatedSubtasks);
    
    if (updatedSubtasks.length > 0) {
      const completedCount = updatedSubtasks.filter(s => s.completed).length;
      const newProgress = Math.round((completedCount / updatedSubtasks.length) * 100);
      setProgress(newProgress);
      await db.updateTask(task.id, { progress: newProgress });
    }
    onUpdate();
  };

  const handleAddComment = async (e: Event) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const myId = localStorage.getItem('myUserId') || 'me';
    await db.addComment(task.id, myId, newComment);
    setNewComment('');
    setIsAddCommentModalOpen(false);
    setComments(await db.getComments(task.id));
  };

  const handleToggleTimer = async () => {
    if (isTimerRunning) {
      await db.stopTaskTimer(task.id);
    } else {
      await db.startTaskTimer(task.id);
    }
    const updatedTasks = await db.getTasks(task.projectId);
    const updatedTask = updatedTasks.find(t => t.id === task.id);
    if (updatedTask) {
      setIsTimerRunning(updatedTask.isTimerRunning || false);
      setTimerStartedAt(updatedTask.timerStartedAt);
      setTimeSpent(updatedTask.timeSpent || 0);
    }
    onUpdate();
  };

  const priorityColors = {
    high: 'text-rose-500 bg-rose-50 border-rose-100',
    medium: 'text-amber-500 bg-amber-50 border-amber-100',
    low: 'text-slate-500 bg-slate-50 border-slate-100'
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-app-surface w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${completed ? 'bg-emerald-500 text-white' : 'bg-app-background text-app-text-secondary border border-app-border hover:border-emerald-500 hover:text-emerald-500'}`}
            >
              <CheckCircle size={18} />
              <span>{completed ? 'Completed' : 'Mark Complete'}</span>
            </button>
            <div className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${priorityColors[priority]}`}>
              {priority} Priority
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-app-text-secondary hover:bg-rose-500 hover:text-white rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              <div className="space-y-6">
                {isEditing ? (
                  <input type="text" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} className="text-3xl font-bold text-app-text-primary bg-app-background border border-app-border rounded-2xl px-4 py-2 w-full focus:ring-2 focus:ring-primary/50" />
                ) : (
                  <h1 className="text-3xl font-bold text-app-text-primary leading-tight">{title}</h1>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Description</h3>
                    {!isEditing && <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-primary hover:underline">Edit</button>}
                  </div>
                  {isEditing ? (
                    <textarea value={description} onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)} className="w-full bg-app-background border border-app-border rounded-2xl p-4 text-app-text-primary min-h-[120px] focus:ring-2 focus:ring-primary/50 resize-none" />
                  ) : (
                    <p className="text-app-text-secondary leading-relaxed whitespace-pre-wrap">{description || 'No description provided.'}</p>
                  )}
                  {isEditing && (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setIsEditing(false); setTitle(task.title); setDescription(task.description || ''); }} className="px-4 py-2 text-sm font-bold text-app-text-secondary hover:bg-app-background rounded-xl">Cancel</button>
                      <button onClick={handleSaveTask} className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20">Save Changes</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Subtasks</h3>
                    <Badge variant="primary">{subtasks.length}</Badge>
                  </div>
                  <button 
                    onClick={() => setIsAddSubtaskModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all"
                  >
                    <Plus size={14} />
                    <span>Add Subtask</span>
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {subtasks.map(st => (
                    <div key={st.id} className="flex items-center gap-4 p-4 bg-app-background/50 border border-app-border rounded-2xl group min-h-[60px]">
                      <button onClick={() => handleToggleSubtask(st)} className={`size-6 rounded-lg border-2 flex items-center justify-center transition-all ${st.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-app-border hover:border-primary'}`}>{st.completed && <CheckCircle size={14} />}</button>
                      <span className={`flex-1 text-sm font-medium ${st.completed ? 'text-app-text-secondary line-through' : 'text-app-text-primary'}`}>{st.title}</span>
                      <button onClick={() => handleDeleteSubtask(st.id)} className="p-1 text-app-text-secondary opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {subtasks.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-app-border rounded-2xl">
                      <p className="text-xs text-app-text-secondary font-medium">No subtasks yet.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Comments</h3>
                    <Badge variant="primary">{comments.length}</Badge>
                  </div>
                  <button 
                    onClick={() => setIsAddCommentModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all"
                  >
                    <Plus size={14} />
                    <span>Add Comment</span>
                  </button>
                </div>
                <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {comments.map(c => {
                    const u = team.find(user => user.id === c.userId);
                    return (
                      <div key={c.id} className="flex gap-4">
                        <Avatar initials={u?.initials || '??'} size="sm" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between"><span className="text-sm font-bold text-app-text-primary">{u?.name || 'Unknown'}</span><span className="text-[10px] text-app-text-secondary font-medium">{new Date(c.createdAt).toLocaleDateString()}</span></div>
                          <div className="bg-app-background border border-app-border rounded-2xl p-4 text-sm text-app-text-secondary">{c.content}</div>
                        </div>
                      </div>
                    );
                  })}
                  {comments.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-app-border rounded-2xl">
                      <p className="text-xs text-app-text-secondary font-medium">No comments yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-6 bg-app-background/30 rounded-3xl p-6 border border-app-border">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest flex items-center gap-2"><UserIcon size={14} /> Assignees</label>
                      <button 
                        onClick={() => setIsAddAssigneeModalOpen(true)}
                        className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.filter(u => assigneeIds.includes(u.id)).map(u => (
                        <div 
                          key={u.id} 
                          className="flex items-center gap-2 p-1 pr-3 rounded-full border bg-primary/10 border-primary text-primary shadow-sm group/assignee"
                        >
                          <Avatar initials={u.initials} src={u.avatarUrl} size="xs" />
                          <span className="text-[10px] font-bold whitespace-nowrap">{u.name}</span>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleAssignee(u.id);
                            }}
                            className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {assigneeIds.length === 0 && (
                        <p className="text-[10px] text-app-text-secondary italic">No one assigned</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="h-px bg-app-border my-2"></div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-app-text-secondary font-medium"><Calendar size={16} /><span>Due Date</span></div>
                    {isEditing ? <input type="date" value={dueDate} onInput={(e) => setDueDate((e.target as HTMLInputElement).value)} className="bg-app-background border border-app-border rounded-lg px-2 py-1 text-xs text-app-text-primary" /> : <span className="font-bold text-app-text-primary">{dueDate || 'No date'}</span>}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-app-text-secondary font-medium"><AlertCircle size={16} /><span>Priority</span></div>
                    {isEditing ? (
                      <select value={priority} onChange={(e) => setPriority((e.target as HTMLSelectElement).value as Priority)} className="bg-app-background border border-app-border rounded-lg px-2 py-1 text-xs text-app-text-primary">
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                      </select>
                    ) : <Badge variant={priority === 'high' ? 'rose' : priority === 'medium' ? 'amber' : 'slate'}>{priority}</Badge>}
                  </div>
                </div>
                <div className="pt-4 border-t border-app-border">
                  <div className="flex items-center justify-between text-xs text-app-text-secondary mb-2">
                    <span>Progress</span>
                    <span className="font-bold text-emerald-500">{progress}%</span>
                  </div>
                  <div className="relative pt-1">
                    <div className="w-full bg-app-background border border-app-border h-2 rounded-full overflow-hidden mb-2">
                      <div className="bg-emerald-500 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                    {!subtasks.length && (
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={progress} 
                        onInput={(e) => { 
                          const v = parseInt((e.target as HTMLInputElement).value); 
                          setProgress(v); 
                          db.updateTask(task.id, { progress: v }).then(onUpdate); 
                        }} 
                        className="w-full h-1.5 absolute top-1 opacity-0 cursor-pointer accent-emerald-500" 
                      />
                    )}
                  </div>
                  {subtasks.length > 0 && (
                    <p className="text-[9px] text-emerald-600 mt-2 font-bold uppercase tracking-wider text-center">Linked to {subtasks.length} subtasks</p>
                  )}
                </div>
              </div>
              
              <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl space-y-4 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-xl tracking-tighter"><Clock size={20} /><span>{formatTime(timeSpent + elapsedDuringRun)}</span></div>
                <p className="text-[10px] text-app-text-secondary font-bold uppercase tracking-widest mb-4">Total Time Tracked</p>
                <button 
                  onClick={handleToggleTimer}
                  className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${isTimerRunning ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}
                >
                  {isTimerRunning ? <><Square size={18} /> Stop Timer</> : <><Play size={18} /> Start Timer</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtask Modal */}
      <Modal isOpen={isAddSubtaskModalOpen} onClose={() => setIsAddSubtaskModalOpen(false)} title="Add Subtask">
        <div className="space-y-6" onClick={e => e.stopPropagation()}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em]">Subtask Title</label>
            <input autoFocus type="text" value={newSubtaskTitle} onInput={(e) => setNewSubtaskTitle((e.target as HTMLInputElement).value)} placeholder="What needs to be done?" className="w-full px-5 py-4 bg-app-background border border-app-border rounded-2xl text-app-text-primary text-lg font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" required />
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setIsAddSubtaskModalOpen(false)} className="flex-1 px-6 py-4 bg-app-surface border border-app-border rounded-2xl text-sm font-bold text-app-text-secondary hover:bg-app-background transition-all">Cancel</button>
            <button type="button" disabled={!newSubtaskTitle.trim()} onClick={handleAddSubtask} className={`flex-1 px-6 py-4 rounded-2xl text-sm font-bold shadow-xl transition-all ${newSubtaskTitle.trim() ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>Add Subtask</button>
          </div>
        </div>
      </Modal>

      {/* Comment Modal */}
      <Modal isOpen={isAddCommentModalOpen} onClose={() => setIsAddCommentModalOpen(false)} title="Add Comment">
        <div className="space-y-6" onClick={e => e.stopPropagation()}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em]">Comment</label>
            <textarea autoFocus value={newComment} onInput={(e) => setNewComment((e.target as HTMLTextAreaElement).value)} placeholder="Add your comment..." className="w-full px-5 py-4 bg-app-background border border-app-border rounded-2xl text-app-text-primary outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[120px] resize-none" required />
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setIsAddCommentModalOpen(false)} className="flex-1 px-6 py-4 bg-app-surface border border-app-border rounded-2xl text-sm font-bold text-app-text-secondary hover:bg-app-background transition-all">Cancel</button>
            <button type="button" disabled={!newComment.trim()} onClick={handleAddComment} className={`flex-1 px-6 py-4 rounded-2xl text-sm font-bold shadow-xl transition-all ${newComment.trim() ? 'bg-emerald-500 text-white shadow-emerald-500/20 hover:shadow-emerald-500/40' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>Post Comment</button>
          </div>
        </div>
      </Modal>

      {/* Add Assignee Modal */}
      <Modal isOpen={isAddAssigneeModalOpen} onClose={() => setIsAddAssigneeModalOpen(false)} title="Assign Team Members">
        <div className="space-y-4" onClick={e => e.stopPropagation()}>
          <p className="text-xs text-app-text-secondary font-medium">Select team members to assign to this task:</p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {team.map(u => {
              const isAssigned = assigneeIds.includes(u.id);
              return (
                <button 
                  key={u.id} 
                  onClick={() => handleToggleAssignee(u.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${isAssigned ? 'bg-primary/10 border-primary shadow-sm' : 'bg-app-background border-app-border hover:border-primary/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar initials={u.initials} src={u.avatarUrl} size="sm" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-app-text-primary">{u.name}</p>
                      <p className="text-[10px] text-app-text-secondary">{u.role}</p>
                    </div>
                  </div>
                  {isAssigned ? (
                    <div className="size-6 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <CheckCircle size={14} />
                    </div>
                  ) : (
                    <div className="size-6 rounded-full border-2 border-app-border"></div>
                  )}
                </button>
              );
            })}
          </div>
          <button 
            onClick={() => setIsAddAssigneeModalOpen(false)}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 hover:shadow-primary/40 mt-2"
          >
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
};
