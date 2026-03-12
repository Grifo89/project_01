import { Card } from './Card';
import { Icon } from './Icon';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-preact';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down';
  icon: LucideIcon;
  iconVariant?: 'emerald' | 'amber' | 'primary';
}

export const StatCard = ({
  title,
  value,
  trend,
  trendDirection = 'up',
  icon,
  iconVariant = 'primary'
}: StatCardProps) => {
  const iconVariants = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500"
  };

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={`size-8 rounded-lg flex items-center justify-center ${iconVariants[iconVariant]}`}>
          <Icon icon={icon} size={20} />
        </div>
        <p className="text-xs text-app-text-secondary font-medium uppercase tracking-wider">{title}</p>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-2xl font-bold text-app-text-primary">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold uppercase ${trendDirection === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
            <Icon icon={trendDirection === 'up' ? TrendingUp : TrendingDown} size={12} />
            <span>{trend}</span>
          </div>
        )}
      </div>
    </Card>
  );
};
