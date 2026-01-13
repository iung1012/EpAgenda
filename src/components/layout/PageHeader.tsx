import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  badge?: ReactNode;
  variant?: 'default' | 'hero';
  className?: string;
}

export function PageHeader({ 
  title, 
  description, 
  action, 
  icon: Icon,
  badge,
  variant = 'default',
  className 
}: PageHeaderProps) {
  if (variant === 'hero') {
    return (
      <div className={cn(
        "relative overflow-hidden border-b border-border/40",
        "bg-gradient-to-b from-muted/30 to-background",
        className
      )}>
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="relative px-6 py-8 md:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                {(Icon || badge) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    {Icon && <Icon className="h-4 w-4" />}
                    {badge}
                  </div>
                )}
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {title}
                </h1>
                {description && (
                  <p className="text-muted-foreground max-w-md">
                    {description}
                  </p>
                )}
              </div>
              
              {action && (
                <div className="flex-shrink-0">{action}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6",
      className
    )}>
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {badge}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
