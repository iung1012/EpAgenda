import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanTaskCard } from './KanbanTaskCard';
import { Skeleton } from '@/components/ui/skeleton';
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
  tasks: Task[];
  isLoading: boolean;
  getProfileName: (userId: string | null) => string | null;
  getClientName: (clientId: string | null) => string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  isLoading,
  getProfileName,
  getClientName,
  onEdit,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const getColumnStyle = () => {
    switch (id) {
      case 'a_fazer':
        return 'from-secondary/50 to-secondary/20';
      case 'fazendo':
        return 'from-info/10 to-info/5';
      case 'feito':
        return 'from-success/10 to-success/5';
      default:
        return 'from-muted to-muted/50';
    }
  };

  const getIndicatorColor = () => {
    switch (id) {
      case 'a_fazer':
        return 'bg-muted-foreground/60';
      case 'fazendo':
        return 'bg-info';
      case 'feito':
        return 'bg-success';
      default:
        return 'bg-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", getIndicatorColor())} />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-2xl p-3 transition-all duration-300 ease-out min-h-[400px]",
          "bg-gradient-to-b border border-border/40",
          getColumnStyle(),
          isOver && "ring-2 ring-primary/20 border-primary/30 scale-[1.01]"
        )}
      >
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  getProfileName={getProfileName}
                  getClientName={getClientName}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}

              {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border/60 rounded-xl bg-background/30">
                  <div className="text-muted-foreground/60 text-center">
                    <div className="text-2xl mb-1">📋</div>
                    <p className="text-xs font-medium">Arraste tarefas aqui</p>
                  </div>
                </div>
              )}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
