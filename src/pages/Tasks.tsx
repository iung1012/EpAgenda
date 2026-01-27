import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
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
  Sparkles,
  ClipboardList,
  TrendingUp,
  Target,
  User
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
import { StatsCard } from '@/components/layout/StatsCard';
import { StatsSkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { TaskFormDialog, TaskFormValues } from '@/components/forms/TaskFormDialog';
import { useTasks, TaskPriority } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { useClients } from '@/hooks/useClients';
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
  isDemand?: boolean;
  demandId?: string;
}

export default function Tasks() {
  const { tasks, isLoading, error, refetch, getTasksByStatus, updateTaskStatus, updateTaskDeliveryLink } = useTasks();
  const { profiles, getProfileName } = useProfiles();
  const { clients } = useClients({ minimal: true });
  
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
    // Don't allow editing demands from tasks - redirect to demands page
    if (task.isDemand) {
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
    
    // Check if it's a demand
    if (deleteDialog.taskId.startsWith('demand-')) {
      const demandId = deleteDialog.taskId.replace('demand-', '');
      const { error } = await supabase.from('filmmaker_demands').delete().eq('id', demandId);
      setIsDeleting(false);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao excluir demanda', description: error.message });
      } else {
        toast({ title: 'Demanda excluída com sucesso!' });
        setDeleteDialog({ open: false, taskId: '', taskTitle: '' });
        refetch();
      }
    } else {
      const { error } = await supabase.from('tasks').delete().eq('id', deleteDialog.taskId);
      setIsDeleting(false);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao excluir tarefa', description: error.message });
      } else {
        toast({ title: 'Tarefa excluída com sucesso!' });
        setDeleteDialog({ open: false, taskId: '', taskTitle: '' });
        refetch();
      }
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

    const newStatus = columns.find(col => col.id === overId)?.id;
    
    if (newStatus) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-8 border border-border/50">
          <h1 className="text-3xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie as tarefas da equipe</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <ErrorState onRetry={refetch} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header - Enhanced */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-primary/8 to-accent/5 p-6 md:p-8 border border-border/30"
      >
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-primary/15 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-medium text-muted-foreground capitalize mb-2"
            >
              {currentDate}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-3 mb-3"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Gestão de Tarefas
              </h1>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-sm md:text-base max-w-lg"
            >
              Você tem{' '}
              <span className="font-semibold text-foreground">{getTasksByStatus('a_fazer').length + getTasksByStatus('fazendo').length} tarefas</span> pendentes
              {overdueCount > 0 && (
                <> e <span className="font-semibold text-destructive">{overdueCount} atrasadas</span></>
              )}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              onClick={() => { setEditingTask(null); setIsDialogOpen(true); }} 
              size="lg"
              className="gap-2 shadow-lg rounded-xl h-11 px-6"
            >
              <Plus className="h-5 w-5" />
              Nova Tarefa
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Form Dialog */}
      <TaskFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        profiles={profiles}
        clients={clients}
        isEditing={!!editingTask}
        isLoading={isSubmitting}
        defaultValues={editingTask ? {
          title: editingTask.title,
          description: editingTask.description || '',
          priority: editingTask.priority,
          due_date: editingTask.due_date || '',
          assigned_to: editingTask.assigned_to || '',
          client_id: editingTask.client_id || '',
        } : undefined}
      />

      {/* Stats Grid - Enhanced */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <StatsSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatsCard
            title="Total de Tarefas"
            value={tasks.length}
            icon={ClipboardList}
          />
          <StatsCard
            title="A Fazer"
            value={getTasksByStatus('a_fazer').length}
            subtitle={overdueCount > 0 ? `${overdueCount} atrasadas` : undefined}
            icon={overdueCount > 0 ? AlertTriangle : ListTodo}
            variant={overdueCount > 0 ? 'warning' : 'default'}
          />
          <StatsCard
            title="Em Progresso"
            value={getTasksByStatus('fazendo').length}
            icon={Loader2}
            variant="info"
          />
          <StatsCard
            title="Produtividade"
            value={`${productivity}%`}
            subtitle="tarefas concluídas"
            icon={TrendingUp}
            variant="success"
          />
        </motion.div>
      )}

      {/* Task Alerts - Enhanced */}
      {!isLoading && tasks.length > 0 && overdueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm"
        >
          <div className="p-4">
            <TaskAlerts 
              tasks={tasks as Task[]} 
              onTaskClick={handleTaskAlertClick}
            />
          </div>
        </motion.div>
      )}

      {/* Filters - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm"
      >
        <div className="p-4 space-y-3">
          {/* Quick Filter - Minhas Tarefas */}
          <div className="flex items-center gap-2">
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
              className="gap-2 rounded-full"
            >
              <User className="h-4 w-4" />
              Minhas Tarefas
              {assignedFilter === user?.id && (
                <span className="ml-1 bg-primary-foreground/20 px-1.5 py-0.5 rounded-full text-xs">
                  {filteredTasks.length}
                </span>
              )}
            </Button>
          </div>
          
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
      </motion.div>

      {/* Kanban Board with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              onEdit={handleEdit}
              onDelete={(taskId, taskTitle) => setDeleteDialog({ open: true, taskId, taskTitle })}
              onAddTask={() => { setEditingTask(null); setIsDialogOpen(true); }}
              onQuickComplete={handleQuickComplete}
              onReopen={handleReopen}
              onAddDeliveryLink={handleAddDeliveryLink}
            />
          ))}
        </div>

        {/* Drag Overlay for visual feedback */}
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
    </div>
  );
}
