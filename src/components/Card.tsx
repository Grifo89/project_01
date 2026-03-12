import { ComponentChildren } from 'preact';

interface CardProps {
  children: ComponentChildren;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
}

export const Card = ({ children, className = "", noPadding = false, onClick }: CardProps) => {
  return (
    <div 
      className={`bg-app-surface rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${!noPadding ? 'p-5' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
