import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Card } from './Card';
import { Icon } from './Icon';
import { Calendar, MessageSquare, Trash2, Clock, MoreVertical, Play, Square, Archive } from 'lucide-preact';
import { Priority } from '../services/db';
import { useState, useEffect } from 'preact/hooks';

interface TaskCardProps {
  id?: string;
  title: string;
  tag: string;
  tagVariant?: 'primary' | 'amber' | 'emerald' | 'rose' | 'slate' | 'indigo';
  dueDate?: string;
  comments?: number;
  image?: string;
  assignees?: { displayName: string; photoUrl?: string }[];
  progress?: number;
  completed?: boolean;
  priority?: Priority;
  timeSpent?: number;
  isTimerRunning?: boolean;
  timerStartedAt?: string;
  onDelete?: () => void;
  onArchive?: () => void;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  onClick?: () => void;
}

export const TaskCard = ({
  id,
  title,
  tag,
  tagVariant = 'primary',
  dueDate,
  comments,
  image,
  assignees = [],
  progress,
  completed,
  priority = 'medium',
  timeSpent = 0,
  isTimerRunning = false,
  timerStartedAt,
  onDelete,
  onArchive,
  onStartTimer,
  onStopTimer,
  onClick
}: TaskCardProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerStartedAt) {
      interval = setInterval(() => {
        const start = new Date(timerStartedAt).getTime();
        const now = new Date().getTime();
        setElapsed(Math.floor((now - start) / 1000));
      }, 1000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartedAt]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const priorityColors = {
    high: 'text-rose-500 bg-rose-50 border-rose-100',
    medium: 'text-amber-500 bg-amber-50 border-amber-100',
    low: 'text-slate-500 bg-slate-50 border-slate-100'
  };

  return (
    <Card noPadding className={`overflow-hidden group hover:shadow-md hover:bg-primary/5 transition-all duration-300 cursor-pointer border-app-border rounded-2xl relative ${completed ? 'opacity-80' : ''}`} onClick={onClick}>
      {image && (
        <div className="h-24 w-full relative">
          <img src={image} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute top-2 right-2 flex gap-1">
            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${priorityColors[priority]}`}>
              {priority}
            </div>
          </div>
        </div>
      )}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex gap-2">
            {!image && <Badge variant={tagVariant}>{tag}</Badge>}
            {!image && (
              <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${priorityColors[priority]}`}>
                {priority}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
              className="p-1 text-app-text-secondary hover:text-primary transition-colors rounded-lg hover:bg-app-background"
            >
              <MoreVertical size={16} />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-app-surface border border-app-border rounded-xl shadow-xl z-50 py-2 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {isTimerRunning ? (
                  <button
                    onClick={() => { onStopTimer?.(); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <Square size={14} /> <span>Stop Timer</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { onStartTimer?.(); setIsMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-emerald-500 hover:bg-emerald-50 flex items-center gap-2"
                  >
                    <Play size={14} /> <span>Start Timer</span>
                  </button>
                )}
                <button
                  onClick={() => { onArchive?.(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-app-text-primary hover:bg-app-background flex items-center gap-2"
                >
                  <Archive size={14} /> <span>Archive</span>
                </button>
                <div className="h-px bg-app-border my-1"></div>
                <button
                  onClick={() => { onDelete?.(); setIsMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 flex items-center gap-2"
                >
                  <Trash2 size={14} /> <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <h3 className={`font-semibold text-base leading-snug text-app-text-primary ${completed ? 'line-through opacity-50' : ''}`}>
          {title}
        </h3>

        {progress !== undefined && (
          <div className="space-y-2">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex justify-between items-center">
              {assignees.length > 0 && (
                <div className="flex -space-x-2">
                  {assignees.slice(0, 3).map((a, i) => (
                    <Avatar key={i} displayName={a.displayName} photoUrl={a.photoUrl} size="sm" />
                  ))}
                  {assignees.length > 3 && (
                    <div className="size-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500">
                      +{assignees.length - 3}
                    </div>
                  )}
                </div>
              )}
              <span className="text-[10px] text-app-text-secondary font-medium ml-auto">{progress}% Complete</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-1 pt-3 border-t border-app-border/50">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isTimerRunning ? 'text-emerald-500 animate-pulse' : 'text-app-text-secondary'}`}>
              <Clock size={12} />
              <span className="font-mono">{formatTime(timeSpent + elapsed)}</span>
            </div>
            {dueDate && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-app-text-secondary">
                <Calendar size={12} />
                <span>{dueDate}</span>
              </div>
            )}
          </div>

          {comments !== undefined && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-app-text-secondary">
              <MessageSquare size={12} />
              <span>{comments}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
