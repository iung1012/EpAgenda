import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { TaskCardSkeleton } from '@/components/layout/CardSkeleton';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  delivery_link: string | null;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  headerColor: string;
  tasks: Task[];
  isLoading: boolean;
  getPriorityColor: (priority: 'baixa' | 'media' | 'alta') => string;
  getPriorityLabel: (priority: 'baixa' | 'media' | 'alta') => string;
  getProfileName: (userId: string | null) => string | null;
  getClientName: (clientId: string | null) => string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
  onAddTask?: () => void;
  onQuickComplete?: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onAddDeliveryLink?: (taskId: string, link: string) => void;
}

export function KanbanColumn({
  id,
  title,
  icon,
  color,
  headerColor,
  tasks,
  isLoading,
  getPriorityColor,
  getPriorityLabel,
  getProfileName,
  getClientName,
  onEdit,
  onDelete,
  onAddTask,
  onQuickComplete,
  onReopen,
  onAddDeliveryLink,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b",
        headerColor
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", color)}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <span className="text-xs text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
          </div>
        </div>
        {onAddTask && id === 'a_fazer' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-background"
            onClick={onAddTask}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-3 space-y-3 overflow-y-auto bg-muted/20 min-h-[450px] transition-all",
          isOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset"
        )}
      >
        {isLoading ? (
          [...Array(2)].map((_, i) => <TaskCardSkeleton key={i} />)
        ) : (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                getPriorityColor={getPriorityColor}
                getPriorityLabel={getPriorityLabel}
                getProfileName={getProfileName}
                getClientName={getClientName}
                onEdit={onEdit}
                onDelete={onDelete}
                onQuickComplete={onQuickComplete}
                onReopen={onReopen}
                onAddDeliveryLink={onAddDeliveryLink}
              />
            ))}

            {tasks.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-2xl bg-background/50">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  {icon}
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Nenhuma tarefa</p>
                <p className="text-xs text-muted-foreground">Arraste tarefas aqui</p>
              </div>
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
