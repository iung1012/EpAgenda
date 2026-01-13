import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  trend?: { value: number; label: string };
}

const variantStyles = {
  default: {
    icon: 'bg-secondary text-foreground',
    accent: 'text-foreground',
  },
  success: {
    icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    accent: 'text-amber-600 dark:text-amber-400',
  },
  destructive: {
    icon: 'bg-destructive/10 text-destructive',
    accent: 'text-destructive',
  },
  info: {
    icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    accent: 'text-blue-600 dark:text-blue-400',
  },
};

export function StatsCard({ title, value, subtitle, icon: Icon, variant = 'default', trend }: StatsCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 transition-all duration-300 hover:shadow-lg hover:border-border">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 space-y-4">
        {/* Header with icon */}
        <div className="flex items-center justify-between">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <span className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              trend.value >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
            )}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        
        {/* Value */}
        <div className="space-y-1">
          <p className={cn("text-3xl font-semibold tracking-tight tabular-nums", styles.accent)}>
            {value}
          </p>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
