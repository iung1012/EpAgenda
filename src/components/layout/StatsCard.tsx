import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

const variantStyles = {
  default: {
    icon: 'bg-secondary text-foreground',
    value: 'text-foreground',
  },
  success: {
    icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    value: 'text-amber-600 dark:text-amber-400',
  },
  destructive: {
    icon: 'bg-red-500/10 text-red-600 dark:text-red-400',
    value: 'text-red-600 dark:text-red-400',
  },
  info: {
    icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    value: 'text-blue-600 dark:text-blue-400',
  },
};

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = 'default',
  className,
  onClick,
  active 
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const isClickable = !!onClick;

  return (
    <div 
      className={cn(
        "relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200",
        "bg-card/50 backdrop-blur-sm",
        isClickable && "cursor-pointer hover:bg-card/80",
        active && "ring-2 ring-primary/20 border-primary/50 shadow-lg shadow-primary/10",
        !active && "border-border/50 hover:border-border",
        className
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className={cn(
        "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
        "transition-transform duration-200",
        isClickable && "group-hover:scale-105",
        styles.icon
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-2xl font-bold tabular-nums", styles.value)}>
          {value}
        </p>
        <p className="text-sm text-muted-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
