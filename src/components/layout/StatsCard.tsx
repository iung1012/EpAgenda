import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
}

const variantStyles = {
  default: 'bg-secondary text-foreground',
  success: 'bg-green-500/10 text-green-600 dark:text-green-400',
  warning: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

export function StatsCard({ title, value, subtitle, icon: Icon, variant = 'default' }: StatsCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${variantStyles[variant]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
