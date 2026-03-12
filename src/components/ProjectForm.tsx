import { useState } from 'preact/hooks';

interface ProjectFormProps {
  onSubmit: (data: { name: string; description: string; color: string; startDate: string; endDate: string }) => void;
  onCancel: () => void;
}

export const ProjectForm = ({ onSubmit, onCancel }: ProjectFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!name.trim() || !endDate) return;
    onSubmit({ name, description, color, startDate, endDate });
  };

  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#64748b', // slate
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Project Name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          placeholder="e.g., Marketing Campaign"
          className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Start Date</label>
          <input
            type="date"
            value={startDate}
            onInput={(e) => setStartDate((e.target as HTMLInputElement).value)}
            className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">End Date</label>
          <input
            type="date"
            value={endDate}
            onInput={(e) => setEndDate((e.target as HTMLInputElement).value)}
            className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Description</label>
        <textarea
          value={description}
          onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          placeholder="What is this project about?"
          className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[100px] resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Theme Color</label>
        <div className="flex flex-wrap gap-3">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`size-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-app-surface ring-primary scale-110' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-app-background border border-app-border rounded-2xl text-sm font-bold text-app-text-secondary hover:bg-app-border transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-3 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
        >
          Create Project
        </button>
      </div>
    </form>
  );
};
