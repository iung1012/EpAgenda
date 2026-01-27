import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  User, 
  Building2, 
  Pencil, 
  Trash2, 
  GripVertical,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'baixa' | 'media' | 'alta';
  due_date: string | null;
  assigned_to: string | null;
  client_id: string | null;
  status: 'a_fazer' | 'fazendo' | 'feito';
}

interface TaskCardProps {
  task: Task;
  getPriorityColor: (priority: 'baixa' | 'media' | 'alta') => string;
  getPriorityLabel: (priority: 'baixa' | 'media' | 'alta') => string;
  getProfileName: (userId: string | null) => string | null;
  getClientName: (clientId: string | null) => string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
  onQuickComplete?: (taskId: string) => void;
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard({
  task,
  getPriorityColor,
  getPriorityLabel,
  getProfileName,
  getClientName,
  onEdit,
  onDelete,
  onQuickComplete,
}, ref) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assignedName = getProfileName(task.assigned_to);
  const clientName = getClientName(task.client_id);
  
  const getDueDateInfo = () => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    const isOverdue = isPast(date) && task.status !== 'feito';
    const isDueToday = isToday(date);
    const isDueTomorrow = isTomorrow(date);

    let label = format(date, "dd MMM", { locale: ptBR });
    let className = "text-muted-foreground";
    let Icon = Clock;

    if (task.status === 'feito') {
      className = "text-success";
      Icon = CheckCircle2;
    } else if (isOverdue) {
      className = "text-destructive";
      label = "Atrasada";
      Icon = AlertCircle;
    } else if (isDueToday) {
      className = "text-warning";
      label = "Hoje";
    } else if (isDueTomorrow) {
      className = "text-info";
      label = "Amanhã";
    }

    return { label, className, Icon };
  };

  const dueDateInfo = getDueDateInfo();

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getPriorityIndicator = () => {
    switch (task.priority) {
      case 'alta':
        return 'bg-destructive';
      case 'media':
        return 'bg-warning';
      case 'baixa':
        return 'bg-muted-foreground/50';
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-card hover:shadow-md transition-all duration-200 border-l-[3px]",
        isDragging && "opacity-50 shadow-xl ring-2 ring-primary rotate-2",
        task.status === 'feito' && "opacity-75",
        task.priority === 'alta' ? 'border-l-destructive' : 
        task.priority === 'media' ? 'border-l-warning' : 
        'border-l-muted-foreground/30'
      )}
    >
      <CardContent className="p-3 space-y-2.5">
        {/* Header with drag handle and priority */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground mt-0.5 touch-none opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "font-medium text-sm leading-snug",
                task.status === 'feito' && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h4>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wide",
            getPriorityColor(task.priority)
          )}>
            {getPriorityLabel(task.priority)}
          </span>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {dueDateInfo && (
            <span className={cn("flex items-center gap-1", dueDateInfo.className)}>
              <dueDateInfo.Icon className="h-3 w-3" />
              {dueDateInfo.label}
            </span>
          )}
          
          {clientName && (
            <span className="flex items-center gap-1 text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              <Building2 className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{clientName}</span>
            </span>
          )}
        </div>

        {/* Footer with assignee and actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <TooltipProvider>
            {assignedName ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(assignedName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                      {assignedName.split(' ')[0]}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{assignedName}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground/50">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">Não atribuída</span>
              </div>
            )}
          </TooltipProvider>

          {/* Actions */}
          <div className="flex gap-0.5">
            {/* Quick Complete Button - Always visible if not completed */}
            {task.status !== 'feito' && onQuickComplete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-success hover:text-success hover:bg-success/10"
                      onClick={() => onQuickComplete(task.id)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Concluir tarefa</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(task)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(task.id, task.title)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

TaskCard.displayName = 'TaskCard';
