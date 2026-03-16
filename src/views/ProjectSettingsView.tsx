import { useState, useEffect } from 'preact/hooks';
import { db, Project } from '../services/db';
import { Card } from '../components/Card';
import { Trash2, Save, AlertTriangle, Palette, Layout, Calendar, Clock } from 'lucide-preact';

interface ProjectSettingsViewProps {
  currentProject: Project | null;
  onUpdate: () => void;
  onDelete: (id: string) => void;
}

export const ProjectSettingsView = ({ currentProject, onUpdate, onDelete }: ProjectSettingsViewProps) => {
  const [name, setName] = useState(currentProject?.name || '');
  const [description, setDescription] = useState(currentProject?.description || '');
  const [color, setColor] = useState(currentProject?.color || '#3b82f6');
  const [startDate, setStartDate] = useState(currentProject?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(currentProject?.endDate || '');
  const [sprintStartDay, setSprintStartDay] = useState(currentProject?.sprintStartDay || 1);
  const [sprintDurationWeeks, setSprintDurationWeeks] = useState(currentProject?.sprintDurationWeeks || 2);

  useEffect(() => {
    if (currentProject) {
      setName(currentProject.name);
      setDescription(currentProject.description || '');
      setColor(currentProject.color || '#3b82f6');
      setStartDate(currentProject.startDate || currentProject.createdAt.split(' ')[0]);
      setEndDate(currentProject.endDate || '');
      setSprintStartDay(currentProject.sprintStartDay || 1);
      setSprintDurationWeeks(currentProject.sprintDurationWeeks || 2);
    }
  }, [currentProject]);

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!currentProject || !name.trim()) return;
    await db.updateProject(currentProject.id, {
      name,
      description,
      color,
      startDate,
      endDate,
      sprintStartDay,
      sprintDurationWeeks
    });
    onUpdate();
    alert('Project settings updated successfully!');
  };

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 text-center">
        <p className="text-app-text-secondary">No project selected.</p>
      </div>
    );
  }

  const colors = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#10b981', label: 'Emerald' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#ef4444', label: 'Rose' },
    { value: '#6366f1', label: 'Indigo' },
    { value: '#8b5cf6', label: 'Violet' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#64748b', label: 'Slate' },
  ];

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <div className="flex-1 px-6 lg:px-10 py-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-text-primary">Project Settings</h1>
          <p className="text-app-text-secondary text-sm mt-1">Manage your project details and preferences.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8 pb-20">
          <Card className="p-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* General Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-app-text-primary flex items-center gap-2">
                  <Layout size={20} className="text-primary" />
                  General Information
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest">Project Name</label>
                    <input
                      type="text"
                      value={name}
                      onInput={(e) => setName((e.target as HTMLInputElement).value)}
                      className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onInput={(e) => setStartDate((e.target as HTMLInputElement).value)}
                      className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest">End Date</label>
                    <input
                      type="date"
                      value={endDate || ''}
                      onInput={(e) => setEndDate((e.target as HTMLInputElement).value)}
                      className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest">Description</label>
                    <textarea
                      value={description}
                      onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
                      className="w-full px-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[120px] resize-none"
                      placeholder="What is this project about?"
                    />
                  </div>
                </div>
              </div>

              {/* Visual Identity */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-app-text-primary flex items-center gap-2">
                  <Palette size={20} className="text-primary" />
                  Visual Identity
                </h3>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest">Project Color</label>
                  <div className="grid grid-cols-4 gap-3">
                    {colors.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={`size-10 rounded-xl transition-all border-4 ${color === c.value ? 'border-primary scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-app-background rounded-2xl border border-app-border">
                  <h4 className="text-xs font-bold text-app-text-secondary uppercase tracking-widest mb-4">Appearance Preview</h4>
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg text-xl" style={{ backgroundColor: color }}>
                      {name.charAt(0).toUpperCase() || 'P'}
                    </div>
                    <div>
                      <p className="font-bold text-app-text-primary">{name || 'Project Name'}</p>
                      <p className="text-[10px] text-app-text-secondary uppercase tracking-wider">Active Project</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sprint Configuration */}
            <div className="pt-8 border-t border-app-border">
              <h3 className="text-lg font-bold text-app-text-primary flex items-center gap-2 mb-6">
                <Calendar size={20} className="text-primary" />
                Sprint Configuration
              </h3>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest">Sprint Start Day</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-secondary" size={18} />
                    <select
                      value={sprintStartDay}
                      onChange={(e) => setSprintStartDay(parseInt((e.target as HTMLSelectElement).value))}
                      className="w-full pl-12 pr-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                    >
                      {daysOfWeek.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[10px] text-app-text-secondary mt-1 italic">The day of the week when a new sprint automatically begins.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-app-text-secondary uppercase tracking-widest">Sprint Duration (Weeks)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-secondary" size={18} />
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={sprintDurationWeeks}
                      onInput={(e) => setSprintDurationWeeks(parseInt((e.target as HTMLInputElement).value))}
                      className="w-full pl-12 pr-4 py-3 bg-app-background border border-app-border rounded-2xl text-app-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-app-text-secondary mt-1 italic">Number of weeks for each sprint (1-4).</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-8 border-t border-app-border">
              <button
                type="submit"
                className="flex items-center gap-2 px-10 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              >
                <Save size={18} />
                <span>Save All Changes</span>
              </button>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-8 border-rose-500/20 bg-rose-500/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle size={20} />
                  <h3 className="text-lg font-bold">Danger Zone</h3>
                </div>
                <p className="text-sm text-app-text-secondary max-w-md">
                  Once you delete a project, there is no going back. This will delete all columns, tasks, and associated data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this project? This action is irreversible.')) {
                    onDelete(currentProject.id);
                  }
                }}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all"
              >
                <Trash2 size={18} />
                <span>Delete Project</span>
              </button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
};
