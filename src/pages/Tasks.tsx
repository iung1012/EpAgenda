import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Loader2,
  ListTodo,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  Target,
  User,
  Trash2
} from 'lucide-react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  DragStartEvent, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  TouchSensor
} from '@dnd-kit/core';
import { isPast, isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ErrorState } from '@/components/layout/ErrorState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { TaskFormDialog, TaskFormValues } from '@/components/forms/TaskFormDialog';
import { useTasks, TaskPriority, TaskSource } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { useMinimalClients } from '@/hooks/useClients';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { TaskCard } from '@/components/kanban/TaskCard';
import { TaskFilters } from '@/components/kanban/TaskFilters';
import { TaskAlerts } from '@/components/kanban/TaskAlerts';

type TaskStatus = 'a_fazer' | 'fazendo' | 'feito';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  client_id: string | null;
  status: TaskStatus;
  delivery_link: string | null;
  source: TaskSource;
  sourceId: string;
}

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, isLoading, error, refetch, getTasksByStatus, updateTaskStatus, updateTaskDeliveryLink } = useTasks();
  const { profiles, getProfileName } = useProfiles();
  const { clients } = useMinimalClients();
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; taskId: string; taskTitle: string }>({
    open: false,
    taskId: '',
    taskTitle: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAllCompletedDialog, setDeleteAllCompletedDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  const { user } = useAuth();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  // Auto-open task from URL query param (e.g. from notification click)
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && !isLoading && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        setEditingTask(task as Task);
        setIsDialogOpen(true);
      }
      searchParams.delete('taskId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, tasks, isLoading]);

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (priorityFilter !== 'all') count++;
    if (assignedFilter !== 'all') count++;
    if (clientFilter !== 'all') count++;
    return count;
  }, [priorityFilter, assignedFilter, clientFilter]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(search);
        const matchesDescription = task.description?.toLowerCase().includes(search);
        if (!matchesTitle && !matchesDescription) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // Assigned filter
      if (assignedFilter !== 'all' && task.assigned_to !== assignedFilter) return false;

      // Client filter
      if (clientFilter !== 'all' && task.client_id !== clientFilter) return false;

      return true;
    });
  }, [tasks, searchTerm, priorityFilter, assignedFilter, clientFilter]);

  const getFilteredTasksByStatus = (status: TaskStatus) => {
    return filteredTasks.filter(t => t.status === status);
  };

  // Count overdue tasks
  const overdueCount = useMemo(() => {
    return tasks.filter(t => 
      t.status !== 'feito' && 
      t.due_date && 
      isPast(new Date(t.due_date)) && 
      !isToday(new Date(t.due_date))
    ).length;
  }, [tasks]);

  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setAssignedFilter('all');
    setClientFilter('all');
  };

  const handleTaskAlertClick = (taskId: string) => {
    // Find the task and scroll to it / highlight it
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTask(task as Task);
      setIsDialogOpen(true);
    }
  };

  const handleSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    
    if (editingTask) {
      const { error } = await supabase.from('tasks').update({
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        due_date: data.due_date || null,
        assigned_to: data.assigned_to || null,
        client_id: data.client_id || null,
      }).eq('id', editingTask.id);
      setIsSubmitting(false);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao atualizar tarefa', description: error.message });
      } else {
        toast({ title: 'Tarefa atualizada com sucesso!' });
        setIsDialogOpen(false);
        setEditingTask(null);
        refetch();
      }
    } else {
      const { error } = await supabase.from('tasks').insert({
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        due_date: data.due_date || null,
        assigned_to: data.assigned_to || null,
        client_id: data.client_id || null,
        created_by: user?.id,
        status: 'a_fazer',
      });
      setIsSubmitting(false);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao criar tarefa', description: error.message });
      } else {
        toast({ title: 'Tarefa criada com sucesso!' });
        setIsDialogOpen(false);
        refetch();
      }
    }
  };

  const handleEdit = (task: Task) => {
    if (task.source === 'demand') {
      toast({
        title: 'Demanda',
        description: 'Edite esta demanda na página de Demandas do Filmmaker'
      });
      return;
    }
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async () => {
    setIsDeleting(true);

    const task = tasks.find(t => t.id === deleteDialog.taskId);
    const isDemand = task?.source === 'demand';
    const sourceId = task?.sourceId ?? deleteDialog.taskId;

    const { error } = isDemand
      ? await supabase.from('filmmaker_demands').delete().eq('id', sourceId)
      : await supabase.from('tasks').delete().eq('id', sourceId);

    setIsDeleting(false);

    if (error) {
      toast({ variant: 'destructive', title: isDemand ? 'Erro ao excluir demanda' : 'Erro ao excluir tarefa', description: error.message });
    } else {
      toast({ title: isDemand ? 'Demanda excluída com sucesso!' : 'Tarefa excluída com sucesso!' });
      setDeleteDialog({ open: false, taskId: '', taskTitle: '' });
      refetch();
    }
  };

  const completedTasks = getTasksByStatus('feito');
  const regularCompletedIds = completedTasks.filter(t => t.source === 'task').map(t => t.sourceId);
  const demandCompletedIds = completedTasks.filter(t => t.source === 'demand').map(t => t.sourceId);

  const handleDeleteAllCompleted = async () => {
    setIsDeletingAll(true);
    const promises: Promise<any>[] = [];
    if (regularCompletedIds.length > 0) {
      promises.push(Promise.resolve(supabase.from('tasks').delete().in('id', regularCompletedIds)));
    }
    if (demandCompletedIds.length > 0) {
      promises.push(Promise.resolve(supabase.from('filmmaker_demands').delete().in('id', demandCompletedIds)));
    }
    const results = await Promise.all(promises);
    const hasError = results.some(r => r.error);
    setIsDeletingAll(false);
    setDeleteAllCompletedDialog(false);
    if (hasError) {
      toast({ variant: 'destructive', title: 'Erro ao excluir algumas tarefas' });
    } else {
      toast({ title: `${completedTasks.length} tarefas concluídas excluídas!` });
      refetch();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task as Task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    console.log('[DragEnd] active.id:', taskId, 'over.id:', overId, 'over.data:', over.data?.current);

    // Check if dropped on a column directly
    const columnIds = columns.map(col => col.id);
    let newStatus: TaskStatus | undefined;
    
    if (columnIds.includes(overId as TaskStatus)) {
      newStatus = overId as TaskStatus;
    } else {
      // Dropped on a task - find its parent column via the task's status
      const targetTask = tasks.find(t => t.id === overId);
      if (targetTask) {
        newStatus = targetTask.status as TaskStatus;
      }
    }

    console.log('[DragEnd] resolved newStatus:', newStatus);

    if (newStatus) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        console.log('[DragEnd] moving task from', task.status, 'to', newStatus);
        const { error } = await updateTaskStatus(taskId, newStatus);
        if (error) {
          toast({ variant: 'destructive', title: 'Erro ao mover tarefa' });
        } else {
          toast({ title: 'Tarefa movida!' });
        }
      }
    }
  };

  const handleQuickComplete = async (taskId: string) => {
    const { error } = await updateTaskStatus(taskId, 'feito');
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao concluir tarefa' });
    } else {
      toast({ title: 'Tarefa concluída!' });
    }
  };

  const handleReopen = async (taskId: string) => {
    const { error } = await updateTaskStatus(taskId, 'a_fazer');
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao reabrir tarefa' });
    } else {
      toast({ title: 'Tarefa reaberta!' });
    }
  };

  const handleMoveToProgress = async (taskId: string) => {
    const { error } = await updateTaskStatus(taskId, 'fazendo');
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao mover tarefa' });
    } else {
      toast({ title: 'Tarefa em progresso!' });
    }
  };

  const handleAddDeliveryLink = async (taskId: string, link: string) => {
    // Find the task to get its title for the notification
    const task = tasks.find(t => t.id === taskId);
    const { error } = await updateTaskDeliveryLink(taskId, link, task?.title);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar link' });
    } else {
      toast({ title: 'Link salvo e admins notificados!' });
    }
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || null;
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'alta': return 'bg-destructive/10 text-destructive';
      case 'media': return 'bg-warning/10 text-warning';
      case 'baixa': return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'alta': return 'Alta';
      case 'media': return 'Média';
      case 'baixa': return 'Baixa';
    }
  };

  const columns = [
    { 
      id: 'a_fazer' as const, 
      title: 'A Fazer', 
      icon: <Circle className="h-4 w-4 text-slate-500" />,
      color: 'bg-slate-100 dark:bg-slate-800',
      headerColor: 'bg-slate-50/80 dark:bg-slate-800/50'
    },
    { 
      id: 'fazendo' as const, 
      title: 'Em Progresso', 
      icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
      color: 'bg-blue-100 dark:bg-blue-900/30',
      headerColor: 'bg-blue-50/80 dark:bg-blue-900/20'
    },
    { 
      id: 'feito' as const, 
      title: 'Concluído', 
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      color: 'bg-emerald-100 dark:bg-emerald-900/30',
      headerColor: 'bg-emerald-50/80 dark:bg-emerald-900/20'
    },
  ];

  const currentDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const productivity = tasks.length > 0 
    ? Math.round((getTasksByStatus('feito').length / tasks.length) * 100) 
    : 0;

  if (error) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Tarefas</h1>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <ErrorState onRetry={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Compact Header Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-3"
      >
        {/* Top row: Title + Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestão de Tarefas</h1>
              <p className="text-xs text-muted-foreground capitalize">{currentDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {completedTasks.length > 0 && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteAllCompletedDialog(true)}
                  className="gap-2 rounded-xl h-9 px-4 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Limpar Concluídas</span>
                  <span className="bg-destructive/10 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">{completedTasks.length}</span>
                </Button>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} 
                size="sm"
                className="gap-2 shadow-md rounded-xl h-9 px-4"
              >
                <Plus className="h-4 w-4" />
                Nova Tarefa
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Inline Stats Row */}
        {!isLoading && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border/50 text-sm">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{tasks.length}</span>
              <span className="text-muted-foreground text-xs">total</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary border border-border/50 text-sm">
              <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{getTasksByStatus('a_fazer').length}</span>
              <span className="text-muted-foreground text-xs">a fazer</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-info/10 border border-info/20 text-sm">
              <Loader2 className="h-3.5 w-3.5 text-info animate-spin" />
              <span className="font-semibold tabular-nums text-info">{getTasksByStatus('fazendo').length}</span>
              <span className="text-info/70 text-xs">em progresso</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-sm">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span className="font-semibold tabular-nums text-success">{productivity}%</span>
              <span className="text-success/70 text-xs">concluído</span>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="font-semibold tabular-nums text-destructive">{overdueCount}</span>
                <span className="text-destructive/70 text-xs">atrasadas</span>
              </div>
            )}
          </div>
        )}

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <Button
            variant={assignedFilter === user?.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (assignedFilter === user?.id) {
                setAssignedFilter('all');
              } else {
                setAssignedFilter(user?.id || 'all');
              }
            }}
            className="gap-1.5 rounded-full h-8 text-xs"
          >
            <User className="h-3.5 w-3.5" />
            Minhas Tarefas
            {assignedFilter === user?.id && (
              <span className="ml-0.5 bg-primary-foreground/20 px-1.5 py-0.5 rounded-full text-[10px]">
                {filteredTasks.length}
              </span>
            )}
          </Button>
          <div className="flex-1 w-full sm:w-auto">
            <TaskFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              priorityFilter={priorityFilter}
              onPriorityChange={setPriorityFilter}
              assignedFilter={assignedFilter}
              onAssignedChange={setAssignedFilter}
              clientFilter={clientFilter}
              onClientChange={setClientFilter}
              profiles={profiles}
              clients={clients}
              activeFiltersCount={activeFiltersCount}
              onClearFilters={clearFilters}
            />
          </div>
        </div>
      </motion.div>

      {/* Task Alerts - Compact */}
      {!isLoading && tasks.length > 0 && overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-3"
        >
          <TaskAlerts 
            tasks={tasks as Task[]} 
            onTaskClick={handleTaskAlertClick}
          />
        </motion.div>
      )}

      {/* Form Dialog */}
      <TaskFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        profiles={profiles}
        clients={clients}
        isEditing={!!editingTask}
        isLoading={isSubmitting}
        taskId={editingTask?.id}
        defaultValues={editingTask ? {
          title: editingTask.title,
          description: editingTask.description || '',
          priority: editingTask.priority,
          due_date: editingTask.due_date || '',
          assigned_to: editingTask.assigned_to || '',
          client_id: editingTask.client_id || '',
        } : undefined}
      />

      {/* Kanban Board - Full remaining height */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              icon={column.icon}
              color={column.color}
              headerColor={column.headerColor}
              tasks={getFilteredTasksByStatus(column.id) as Task[]}
              isLoading={isLoading}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              getProfileName={getProfileName}
              getClientName={getClientName}
              onEdit={handleEdit as (task: { id: string }) => void}
              onDelete={(taskId, taskTitle) => setDeleteDialog({ open: true, taskId, taskTitle })}
              onAddTask={() => { setEditingTask(null); setIsDialogOpen(true); }}
              onQuickComplete={handleQuickComplete}
              onReopen={handleReopen}
              onAddDeliveryLink={handleAddDeliveryLink}
              onMoveToProgress={handleMoveToProgress}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[300px]">
              <TaskCard
                task={activeTask}
                getPriorityColor={getPriorityColor}
                getPriorityLabel={getPriorityLabel}
                getProfileName={getProfileName}
                getClientName={getClientName}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Excluir tarefa"
        description={`Tem certeza que deseja excluir a tarefa "${deleteDialog.taskTitle}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        onConfirm={handleDeleteTask}
        variant="destructive"
        isLoading={isDeleting}
      />

      {/* Confirm Delete All Completed Dialog */}
      <ConfirmDialog
        open={deleteAllCompletedDialog}
        onOpenChange={setDeleteAllCompletedDialog}
        title="Excluir todas as concluídas"
        description={`Tem certeza que deseja excluir ${completedTasks.length} tarefa(s) concluída(s)? Esta ação não pode ser desfeita.`}
        confirmText="Excluir todas"
        onConfirm={handleDeleteAllCompleted}
        variant="destructive"
        isLoading={isDeletingAll}
      />
    </div>
  );
}
