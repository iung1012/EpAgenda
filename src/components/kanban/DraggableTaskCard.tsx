import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, User, Building2, Pencil, Trash2, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface DraggableTaskCardProps {
  task: Task;
  getPriorityColor: (priority: 'baixa' | 'media' | 'alta') => string;
  getPriorityLabel: (priority: 'baixa' | 'media' | 'alta') => string;
  getProfileName: (userId: string | null) => string | null;
  getClientName: (clientId: string | null) => string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
}

export function DraggableTaskCard({
  task,
  getPriorityColor,
  getPriorityLabel,
  getProfileName,
  getClientName,
  onEdit,
  onDelete,
}: DraggableTaskCardProps) {
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`hover-lift transition-shadow ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${getPriorityColor(task.priority)}`}>
            {getPriorityLabel(task.priority)}
          </span>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pl-6">
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(task.due_date), "dd MMM", { locale: ptBR })}
            </span>
          )}
          {getProfileName(task.assigned_to) && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {getProfileName(task.assigned_to)}
            </span>
          )}
          {getClientName(task.client_id) && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {getClientName(task.client_id)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 pt-2 border-t justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onEdit(task)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(task.id, task.title)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
