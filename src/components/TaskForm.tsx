import { useState } from 'preact/hooks';
import { Priority, ProjectMember } from '../services/db';
import { User as UserIcon, Calendar, Tag, AlertCircle, ChevronDown, X } from 'lucide-preact';
import { Avatar } from './Avatar';

interface TaskFormProps {
  users?: ProjectMember[];
  onSubmit: (data: {
    title: string;
    description: string;
    tag: string;
    tagVariant: string;
    dueDate: string;
    priority: Priority;
    assigneeIds?: string[];
  }) => void;
  onCancel: () => void;
  initialData?: Partial<{
    title: string;
    description: string;
    tag: string;
    tagVariant: string;
    dueDate: string;
    priority: Priority;
    assigneeIds: string[];
  }>;
}

export const TaskForm = ({ users = [], onSubmit, onCancel, initialData }: TaskFormProps) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [tag, setTag] = useState(initialData?.tag || 'TASK');
  const [tagVariant, setTagVariant] = useState(initialData?.tagVariant || 'primary');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [priority, setPriority] = useState<Priority>(initialData?.priority || 'medium');
  // Phase 1 will default to the signed-in user's authUid; for now tasks start unassigned
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initialData?.assigneeIds || []);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, tag, tagVariant, dueDate, priority, assigneeIds });
  };

  const toggleAssignee = (authUid: string) => {
    setAssigneeIds(prev => prev.includes(authUid) ? prev.filter(id => id !== authUid) : [...prev, authUid]);
  };

  const variants = [
    { id: 'primary', label: 'Blue' }, { id: 'emerald', label: 'Green' },
    { id: 'amber', label: 'Orange' }, { id: 'slate', label: 'Gray' },
    { id: 'indigo', label: 'Indigo' },
  ];

  const priorities: { id: Priority; label: string }[] = [
    { id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em]">Task Title</label>
        <input autoFocus type="text" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="What needs to be done?" className="w-full px-5 py-4 bg-app-background border border-app-border rounded-2xl text-app-text-primary text-lg font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" required />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em]">Description</label>
        <textarea value={description} onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)} placeholder="Add more details..." className="w-full px-5 py-4 bg-app-background border border-app-border rounded-2xl text-app-text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] resize-none" />
      </div>

      {users.length > 0 && (
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em] flex items-center gap-2">
            <UserIcon size={12} /> Assignees
          </label>
          <div className="flex flex-wrap gap-2">
            {users.map(u => (
              <button key={u.authUid} type="button" onClick={() => toggleAssignee(u.authUid)} className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all ${assigneeIds.includes(u.authUid) ? 'bg-primary/10 border-primary text-primary' : 'bg-app-background border-app-border text-app-text-secondary hover:border-primary/50'}`}>
                <Avatar displayName={u.displayName} photoUrl={u.photoUrl ?? undefined} size="xs" />
                <span className="text-xs font-bold">{u.displayName}</span>
                {assigneeIds.includes(u.authUid) && <X size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em] flex items-center gap-2"><Calendar size={12} /> Due Date</label>
          <input type="date" value={dueDate} onInput={(e) => setDueDate((e.target as HTMLInputElement).value)} className="w-full px-5 py-3.5 bg-app-background border border-app-border rounded-2xl text-app-text-primary font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em] flex items-center gap-2"><AlertCircle size={12} /> Priority</label>
          <div className="relative">
            <select value={priority} onChange={(e) => setPriority((e.target as HTMLSelectElement).value as Priority)} className="w-full px-5 py-3.5 bg-app-background border border-app-border rounded-2xl text-app-text-primary font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none">
              {priorities.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-app-text-secondary pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em] flex items-center gap-2"><Tag size={12} /> Tag</label>
          <input type="text" value={tag} onInput={(e) => setTag((e.target as HTMLInputElement).value)} placeholder="UI, BUG..." className="w-full px-4 py-3.5 bg-app-background border border-app-border rounded-2xl text-app-text-primary font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em]">Color</label>
          <div className="relative">
            <select value={tagVariant} onChange={(e) => setTagVariant((e.target as HTMLSelectElement).value)} className="w-full px-4 py-3.5 bg-app-background border border-app-border rounded-2xl text-app-text-primary font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none">
              {variants.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-secondary pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-6 py-4 bg-app-surface border border-app-border rounded-2xl text-sm font-bold text-app-text-secondary hover:bg-app-background transition-all">Discard</button>
        <button type="submit" className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl text-sm font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all">Create Task</button>
      </div>
    </form>
  );
};
