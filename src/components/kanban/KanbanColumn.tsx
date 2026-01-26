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
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-t-xl border-b",
        headerColor
      )}>
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", color)}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <span className="text-xs text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
          </div>
        </div>
        {onAddTask && id === 'a_fazer' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
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
          "flex-1 p-2 space-y-2 overflow-y-auto rounded-b-xl border border-t-0 bg-muted/30 min-h-[400px] transition-all",
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
              />
            ))}

            {tasks.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl bg-background/50">
                <p className="text-sm text-muted-foreground">Nenhuma tarefa</p>
                <p className="text-xs text-muted-foreground/70">Arraste tarefas aqui</p>
              </div>
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
