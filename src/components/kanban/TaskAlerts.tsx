import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, CalendarClock, ChevronDown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isPast, isToday, isTomorrow, addDays, isWithinInterval, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

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

  const TaskChip = ({ task, variant }: { task: Task; variant: 'danger' | 'warning' | 'info' }) => {
    const variantStyles = {
      danger: 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20',
      warning: 'bg-warning/10 hover:bg-warning/20 text-warning border-warning/20',
      info: 'bg-info/10 hover:bg-info/20 text-info border-info/20'
    };

    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onTaskClick?.(task.id)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
          variantStyles[variant]
        )}
      >
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          task.priority === 'alta' ? 'bg-destructive' : 
          task.priority === 'media' ? 'bg-warning' : 'bg-muted-foreground'
        )} />
        <span className="truncate max-w-[140px]">{task.title}</span>
      </motion.button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <Button 
        variant="ghost" 
        className="w-full justify-between p-0 h-auto hover:bg-transparent group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <motion.div 
            animate={{ rotate: overdueTasks.length > 0 ? [0, -10, 10, -10, 0] : 0 }}
            transition={{ duration: 0.5, repeat: overdueTasks.length > 0 ? Infinity : 0, repeatDelay: 3 }}
            className={cn(
              "p-2 rounded-xl",
              overdueTasks.length > 0 ? "bg-destructive/10" : "bg-warning/10"
            )}
          >
            {overdueTasks.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Zap className="h-4 w-4 text-warning" />
            )}
          </motion.div>
          <div className="text-left">
            <span className="font-semibold text-sm block">
              {overdueTasks.length > 0 
                ? `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? 's' : ''} atrasada${overdueTasks.length > 1 ? 's' : ''}`
                : `${totalAlerts} tarefa${totalAlerts > 1 ? 's' : ''} próxima${totalAlerts > 1 ? 's' : ''}`
              }
            </span>
            <span className="text-xs text-muted-foreground">
              Clique para ver detalhes
            </span>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-xl border border-destructive/20 bg-destructive/5"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Atrasadas</span>
                  <Badge variant="destructive" className="h-5 text-[10px]">
                    {overdueTasks.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {overdueTasks.slice(0, 5).map(task => (
                    <TaskChip key={task.id} task={task} variant="danger" />
                  ))}
                  {overdueTasks.length > 5 && (
                    <span className="text-xs text-muted-foreground self-center px-2">
                      +{overdueTasks.length - 5} mais
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Today's Tasks */}
            {todayTasks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className="p-3 rounded-xl border border-warning/20 bg-warning/5"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium text-warning">Hoje</span>
                  <Badge className="h-5 text-[10px] bg-warning/20 text-warning border-0">
                    {todayTasks.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {todayTasks.slice(0, 5).map(task => (
                    <TaskChip key={task.id} task={task} variant="warning" />
                  ))}
                  {todayTasks.length > 5 && (
                    <span className="text-xs text-muted-foreground self-center px-2">
                      +{todayTasks.length - 5} mais
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Tomorrow's Tasks */}
            {tomorrowTasks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 rounded-xl border border-info/20 bg-info/5"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <CalendarClock className="h-4 w-4 text-info" />
                  <span className="text-sm font-medium text-info">Amanhã</span>
                  <Badge className="h-5 text-[10px] bg-info/20 text-info border-0">
                    {tomorrowTasks.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tomorrowTasks.slice(0, 5).map(task => (
                    <TaskChip key={task.id} task={task} variant="info" />
                  ))}
                  {tomorrowTasks.length > 5 && (
                    <span className="text-xs text-muted-foreground self-center px-2">
                      +{tomorrowTasks.length - 5} mais
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Upcoming this week */}
            {upcomingTasks.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-xs text-muted-foreground px-1"
              >
                +{upcomingTasks.length} tarefa{upcomingTasks.length > 1 ? 's' : ''} vence{upcomingTasks.length > 1 ? 'm' : ''} esta semana
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
