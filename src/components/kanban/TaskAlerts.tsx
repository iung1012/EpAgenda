import { useMemo } from 'react';
import { AlertTriangle, Clock, CalendarClock, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isPast, isToday, isTomorrow, addDays, isWithinInterval, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: 'a_fazer' | 'fazendo' | 'feito';
  priority: 'baixa' | 'media' | 'alta';
}

interface TaskAlertsProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function TaskAlerts({ tasks, onTaskClick }: TaskAlertsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { overdueTasks, todayTasks, tomorrowTasks, upcomingTasks } = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);

    const activeTasks = tasks.filter(t => t.status !== 'feito' && t.due_date);

    const overdue = activeTasks.filter(t => {
      const dueDate = new Date(t.due_date!);
      return isPast(dueDate) && !isToday(dueDate);
    });

    const dueToday = activeTasks.filter(t => isToday(new Date(t.due_date!)));

    const dueTomorrow = activeTasks.filter(t => isTomorrow(new Date(t.due_date!)));

    const upcoming = activeTasks.filter(t => {
      const dueDate = new Date(t.due_date!);
      return isWithinInterval(dueDate, { start: addDays(tomorrow, 1), end: nextWeek });
    });

    return {
      overdueTasks: overdue,
      todayTasks: dueToday,
      tomorrowTasks: dueTomorrow,
      upcomingTasks: upcoming,
    };
  }, [tasks]);

  const totalAlerts = overdueTasks.length + todayTasks.length + tomorrowTasks.length;

  if (totalAlerts === 0) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="space-y-3">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg",
                overdueTasks.length > 0 ? "bg-destructive/10" : "bg-warning/10"
              )}>
                {overdueTasks.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <CalendarClock className="h-4 w-4 text-warning" />
                )}
              </div>
              <span className="font-medium text-sm">
                {overdueTasks.length > 0 
                  ? `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? 's' : ''} atrasada${overdueTasks.length > 1 ? 's' : ''}`
                  : `${totalAlerts} tarefa${totalAlerts > 1 ? 's' : ''} próxima${totalAlerts > 1 ? 's' : ''} do vencimento`
                }
              </span>
              <Badge variant="secondary" className="text-xs">
                {totalAlerts}
              </Badge>
            </div>
            <ChevronRight className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2">
          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm font-medium">Tarefas Atrasadas</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {overdueTasks.slice(0, 5).map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick?.(task.id)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-xs transition-colors"
                    >
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        task.priority === 'alta' ? 'bg-destructive' : 
                        task.priority === 'media' ? 'bg-warning' : 'bg-muted-foreground'
                      )} />
                      <span className="truncate max-w-[150px]">{task.title}</span>
                    </button>
                  ))}
                  {overdueTasks.length > 5 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{overdueTasks.length - 5} mais
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Today's Tasks */}
          {todayTasks.length > 0 && (
            <Alert className="border-warning/30 bg-warning/5">
              <Clock className="h-4 w-4 text-warning" />
              <AlertTitle className="text-sm font-medium">Vencem Hoje</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {todayTasks.slice(0, 5).map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick?.(task.id)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 hover:bg-warning/20 text-xs transition-colors"
                    >
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        task.priority === 'alta' ? 'bg-destructive' : 
                        task.priority === 'media' ? 'bg-warning' : 'bg-muted-foreground'
                      )} />
                      <span className="truncate max-w-[150px]">{task.title}</span>
                    </button>
                  ))}
                  {todayTasks.length > 5 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{todayTasks.length - 5} mais
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Tomorrow's Tasks */}
          {tomorrowTasks.length > 0 && (
            <Alert className="border-info/30 bg-info/5">
              <CalendarClock className="h-4 w-4 text-info" />
              <AlertTitle className="text-sm font-medium">Vencem Amanhã</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {tomorrowTasks.slice(0, 5).map(task => (
                    <button
                      key={task.id}
                      onClick={() => onTaskClick?.(task.id)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-info/10 hover:bg-info/20 text-xs transition-colors"
                    >
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        task.priority === 'alta' ? 'bg-destructive' : 
                        task.priority === 'media' ? 'bg-warning' : 'bg-muted-foreground'
                      )} />
                      <span className="truncate max-w-[150px]">{task.title}</span>
                    </button>
                  ))}
                  {tomorrowTasks.length > 5 && (
                    <span className="text-xs text-muted-foreground self-center">
                      +{tomorrowTasks.length - 5} mais
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Upcoming this week */}
          {upcomingTasks.length > 0 && (
            <div className="text-xs text-muted-foreground px-2">
              +{upcomingTasks.length} tarefa{upcomingTasks.length > 1 ? 's' : ''} vence{upcomingTasks.length > 1 ? 'm' : ''} esta semana
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
