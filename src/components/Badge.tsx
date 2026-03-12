import { ComponentChildren } from 'preact';

interface BadgeProps {
  children: ComponentChildren;
  variant?: 'primary' | 'amber' | 'emerald' | 'rose' | 'slate' | 'indigo';
  size?: 'sm' | 'md' | 'lg' | 'xs';
  className?: string;
}

export const Badge = ({ children, variant = 'primary', size = 'sm', className = "" }: BadgeProps) => {
  const variants = {
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400",
    indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
  };

  const sizes = {
    xs: "px-1.5 py-0.5 text-[9px]",
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm"
  };

  return (
    <span className={`rounded-full font-bold uppercase tracking-wider ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
