import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, CheckSquare, ListTodo, Loader2 } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/layout/StatsCard';
import { StatsSkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { TaskFormDialog, TaskFormValues } from '@/components/forms/TaskFormDialog';
import { useTasks, TaskPriority } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { useClients } from '@/hooks/useClients';
import { DroppableColumn } from '@/components/kanban/DroppableColumn';
import { DraggableTaskCard } from '@/components/kanban/DraggableTaskCard';

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
}

export default function Tasks() {
  const { tasks, isLoading, error, refetch, getTasksByStatus, updateTaskStatus } = useTasks();
  const { profiles, getProfileName } = useProfiles();
  const { clients } = useClients({ minimal: true });
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

  const { user } = useAuth();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
    const { error } = await supabase.from('tasks').delete().eq('id', deleteDialog.taskId);
    setIsDeleting(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir tarefa', description: error.message });
    } else {
      toast({ title: 'Tarefa excluída com sucesso!' });
      setDeleteDialog({ open: false, taskId: '', taskTitle: '' });
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

    // Check if dropped on a column
    const newStatus = columns.find(col => col.id === overId)?.id;
    
    if (newStatus) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        const { error } = await updateTaskStatus(taskId, newStatus);
        if (error) {
          toast({ variant: 'destructive', title: 'Erro ao mover tarefa' });
        }
      }
    }
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || null;
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'alta': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'media': return 'bg-warning/10 text-warning border-warning/20';
      case 'baixa': return 'bg-muted text-muted-foreground border-muted';
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
    { id: 'a_fazer' as const, title: 'A Fazer', color: 'bg-muted' },
    { id: 'fazendo' as const, title: 'Fazendo', color: 'bg-info/10' },
    { id: 'feito' as const, title: 'Feito', color: 'bg-success/10' },
  ];

  if (error) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader title="Tarefas" description="Gerencie as tarefas da equipe" />
        <Card>
          <CardContent className="pt-6">
            <ErrorState onRetry={refetch} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader 
        title="Tarefas" 
        description="Gerencie as tarefas da equipe"
        action={
          <Button onClick={() => { setEditingTask(null); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        }
      />

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

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <StatsSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title="A Fazer"
            value={getTasksByStatus('a_fazer').length}
            icon={ListTodo}
            variant="default"
          />
          <StatsCard
            title="Fazendo"
            value={getTasksByStatus('fazendo').length}
            icon={Loader2}
            variant="info"
          />
          <StatsCard
            title="Feito"
            value={getTasksByStatus('feito').length}
            icon={CheckSquare}
            variant="success"
          />
        </div>
      )}

      {/* Kanban Board with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={getTasksByStatus(column.id) as Task[]}
              isLoading={isLoading}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              getProfileName={getProfileName}
              getClientName={getClientName}
              onEdit={handleEdit}
              onDelete={(taskId, taskTitle) => setDeleteDialog({ open: true, taskId, taskTitle })}
            />
          ))}
        </div>

        {/* Drag Overlay for visual feedback */}
        <DragOverlay>
          {activeTask ? (
            <DraggableTaskCard
              task={activeTask}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              getProfileName={getProfileName}
              getClientName={getClientName}
              onEdit={() => {}}
              onDelete={() => {}}
            />
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
