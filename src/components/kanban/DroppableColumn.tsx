import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableTaskCard } from './DraggableTaskCard';
import { TaskCardSkeleton } from '@/components/layout/CardSkeleton';

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

interface DroppableColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  isLoading: boolean;
  getPriorityColor: (priority: 'baixa' | 'media' | 'alta') => string;
  getPriorityLabel: (priority: 'baixa' | 'media' | 'alta') => string;
  getProfileName: (userId: string | null) => string | null;
  getClientName: (clientId: string | null) => string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
}

export function DroppableColumn({
  id,
  title,
  color,
  tasks,
  isLoading,
  getPriorityColor,
  getPriorityLabel,
  getProfileName,
  getClientName,
  onEdit,
  onDelete,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${color}`} />
          {title}
        </h3>
        <span className="text-sm text-muted-foreground">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[200px] rounded-lg p-2 transition-colors ${
          isOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''
        }`}
      >
        {isLoading ? (
          [...Array(2)].map((_, i) => <TaskCardSkeleton key={i} />)
        ) : (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <DraggableTaskCard
                key={task.id}
                task={task}
                getPriorityColor={getPriorityColor}
                getPriorityLabel={getPriorityLabel}
                getProfileName={getProfileName}
                getClientName={getClientName}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}

            {tasks.length === 0 && (
              <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">Arraste tarefas aqui</p>
              </div>
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
