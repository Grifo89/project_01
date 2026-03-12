import { Badge } from './Badge';
import { Icon } from './Icon';
import { Trash2, MoreHorizontal } from 'lucide-preact';
import { ComponentChildren } from 'preact';
import { useDroppable } from '@dnd-kit/core';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color: string;
  children: ComponentChildren;
  onDelete?: () => void;
}

export const KanbanColumn = ({ id, title, count, color, children, onDelete }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <section 
      className={`min-w-[300px] max-w-[300px] flex flex-col gap-4 rounded-2xl transition-colors duration-200`}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${color}`}></span>
          <h2 className="font-bold text-sm uppercase tracking-wider text-app-text-secondary">{title}</h2>
          <Badge variant="slate">{count.toString()}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {onDelete && (
            <button 
              onClick={onDelete}
              className="p-1 text-app-text-secondary hover:text-rose-500 transition-colors"
              title="Delete Column"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button 
            onClick={() => alert('Column options coming soon!')}
            className="p-1 text-app-text-secondary hover:text-primary transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
      <div 
        ref={setNodeRef}
        className={`flex flex-col gap-4 min-h-[150px] h-full rounded-xl transition-colors duration-200 ${isOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''}`}
      >
        {children}
      </div>
    </section>
  );
};
