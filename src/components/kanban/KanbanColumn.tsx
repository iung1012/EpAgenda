import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCard } from './TaskCard';
import { TaskCardSkeleton } from '@/components/layout/CardSkeleton';
import { Plus, Inbox } from 'lucide-react';
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
  onMoveToProgress?: (taskId: string) => void;
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
  onMoveToProgress,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: id === 'a_fazer' ? 0 : id === 'fazendo' ? 0.1 : 0.2 }}
      className="flex flex-col h-full rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm"
    >
      {/* Column Header */}
      <div className={cn(
        "flex items-center justify-between p-4 border-b border-border/40",
        headerColor
      )}>
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className={cn("p-2.5 rounded-xl shadow-sm", color)}
          >
            {icon}
          </motion.div>
          <div>
            <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
            <span className="text-xs text-muted-foreground">
              {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
            </span>
          </div>
        </div>
        {onAddTask && id === 'a_fazer' && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary rounded-lg"
              onClick={onAddTask}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-3 space-y-3 overflow-y-auto min-h-[450px] transition-all duration-300",
          "bg-gradient-to-b from-muted/10 to-muted/20",
          isOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset"
        )}
      >
        {isLoading ? (
          [...Array(2)].map((_, i) => <TaskCardSkeleton key={i} />)
        ) : (
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence mode="popLayout">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <TaskCard
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
                    onMoveToProgress={onMoveToProgress}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {tasks.length === 0 && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border/50 rounded-xl bg-background/30"
              >
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <Inbox className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground mb-0.5">Nenhuma tarefa</p>
                <p className="text-xs text-muted-foreground/60">Arraste tarefas aqui</p>
              </motion.div>
            )}
          </SortableContext>
        )}
      </div>
    </motion.div>
  );
}
