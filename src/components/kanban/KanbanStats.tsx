import { ListTodo, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanStatsProps {
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
}

export function KanbanStats({ todoCount, inProgressCount, doneCount }: KanbanStatsProps) {
  const total = todoCount + inProgressCount + doneCount;
  const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const stats = [
    {
      label: 'A Fazer',
      value: todoCount,
      icon: ListTodo,
      color: 'text-muted-foreground',
      bg: 'bg-secondary',
    },
    {
      label: 'Em Andamento',
      value: inProgressCount,
      icon: Loader2,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'Concluídas',
      value: doneCount,
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "flex items-center gap-3 p-4 rounded-2xl border border-border/40",
            "bg-card hover:bg-secondary/50 transition-colors duration-200"
          )}
        >
          <div className={cn("p-2.5 rounded-xl", stat.bg)}>
            <stat.icon className={cn("h-5 w-5", stat.color)} />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              {stat.label}
            </p>
          </div>
        </div>
      ))}

      {/* Completion Rate */}
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-card">
        <div className="relative h-12 w-12">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              className="stroke-secondary"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              className="stroke-primary transition-all duration-500 ease-out"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${completionRate} 100`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
            {completionRate}%
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Progresso</p>
          <p className="text-xs text-muted-foreground">{doneCount}/{total} tarefas</p>
        </div>
      </div>
    </div>
  );
}
