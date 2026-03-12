import { useState } from 'preact/hooks';

interface ColumnFormProps {
  onSubmit: (data: { name: string }) => void;
  onCancel: () => void;
}

export const ColumnForm = ({ onSubmit, onCancel }: ColumnFormProps) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-bold text-app-text-secondary uppercase tracking-widest">Column Name</label>
        <input
          autoFocus
          type="text"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          placeholder="e.g., In Review"
          className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          required
        />
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
          Add Column
        </button>
      </div>
    </form>
  );
};
