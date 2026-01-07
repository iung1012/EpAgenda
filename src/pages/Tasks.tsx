import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { ErrorState } from '@/components/layout/ErrorState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { TaskFormDialog, TaskFormValues } from '@/components/forms/TaskFormDialog';
import { useTasks, TaskPriority } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { useClients } from '@/hooks/useClients';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { KanbanTaskCard } from '@/components/kanban/KanbanTaskCard';
import { KanbanStats } from '@/components/kanban/KanbanStats';

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

  const columns = [
    { id: 'a_fazer' as const, title: 'A Fazer' },
    { id: 'fazendo' as const, title: 'Em Andamento' },
    { id: 'feito' as const, title: 'Concluído' },
  ];

  if (error) {
    return (
      <div className="space-y-8 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie as tarefas da equipe</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card p-8">
          <ErrorState onRetry={refetch} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie e organize as tarefas da sua equipe
          </p>
        </div>
        <Button 
          onClick={() => { setEditingTask(null); setIsDialogOpen(true); }}
          className="rounded-xl h-10 px-5 font-medium shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

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
      <KanbanStats
        todoCount={getTasksByStatus('a_fazer').length}
        inProgressCount={getTasksByStatus('fazendo').length}
        doneCount={getTasksByStatus('feito').length}
      />

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={getTasksByStatus(column.id) as Task[]}
              isLoading={isLoading}
              getProfileName={getProfileName}
              getClientName={getClientName}
              onEdit={handleEdit}
              onDelete={(taskId, taskTitle) => setDeleteDialog({ open: true, taskId, taskTitle })}
            />
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 scale-105">
              <KanbanTaskCard
                task={activeTask}
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
