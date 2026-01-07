import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Clock, User, Building2, Pencil, Trash2, GripVertical } from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

interface KanbanTaskCardProps {
  task: Task;
  getProfileName: (userId: string | null) => string | null;
  getClientName: (clientId: string | null) => string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
}

export function KanbanTaskCard({
  task,
  getProfileName,
  getClientName,
  onEdit,
  onDelete,
}: KanbanTaskCardProps) {
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

  const getPriorityStyle = () => {
    switch (task.priority) {
      case 'alta':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'media':
        return 'bg-warning/10 text-warning-foreground border-warning/30';
      case 'baixa':
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  const getPriorityLabel = () => {
    switch (task.priority) {
      case 'alta': return 'Alta';
      case 'media': return 'Média';
      case 'baixa': return 'Baixa';
    }
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd MMM", { locale: ptBR });
  };

  const isDueDatePast = task.due_date && task.status !== 'feito' && isPast(new Date(task.due_date));

  const profileName = getProfileName(task.assigned_to);
  const clientName = getClientName(task.client_id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-card rounded-xl border border-border/60 shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:shadow-md hover:border-border hover:-translate-y-0.5",
        isDragging && "opacity-40 shadow-xl ring-2 ring-primary scale-105 rotate-2"
      )}
    >
      {/* Card Content */}
      <div className="p-3.5">
        {/* Header Row */}
        <div className="flex items-start gap-2 mb-2">
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "mt-0.5 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing",
              "text-muted-foreground/60 hover:text-muted-foreground transition-opacity touch-none"
            )}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h4 className="flex-1 font-medium text-sm leading-snug text-foreground line-clamp-2">
            {task.title}
          </h4>
          <span className={cn(
            "shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
            getPriorityStyle()
          )}>
            {getPriorityLabel()}
          </span>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 pl-6">
            {task.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-1.5 mb-3 pl-6">
          {task.due_date && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
              isDueDatePast
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-muted-foreground"
            )}>
              <Clock className="h-3 w-3" />
              {formatDueDate(task.due_date)}
            </span>
          )}
          {profileName && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
              <User className="h-3 w-3" />
              {profileName}
            </span>
          )}
          {clientName && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
              <Building2 className="h-3 w-3" />
              {clientName}
            </span>
          )}
        </div>

        {/* Actions - Appear on hover */}
        <div className={cn(
          "flex gap-1 justify-end pt-2 border-t border-border/40",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        )}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={() => onEdit(task)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(task.id, task.title)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
