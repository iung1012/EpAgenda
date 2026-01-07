import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Clock, User, Building2, CheckSquare, ListTodo, Loader2, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/layout/StatsCard';
import { TaskCardSkeleton, StatsSkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { TaskFormDialog, TaskFormValues } from '@/components/forms/TaskFormDialog';
import { useTasks, TaskPriority } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { useClients } from '@/hooks/useClients';

export default function Tasks() {
  const { tasks, isLoading, error, refetch, getTasksByStatus, updateTaskStatus } = useTasks();
  const { profiles, getProfileName } = useProfiles();
  const { clients } = useClients({ minimal: true });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<{
    id: string;
    title: string;
    description: string | null;
    priority: 'baixa' | 'media' | 'alta';
    due_date: string | null;
    assigned_to: string | null;
    client_id: string | null;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; taskId: string; taskTitle: string }>({
    open: false,
    taskId: '',
    taskTitle: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    
    if (editingTask) {
      // Update existing task
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
      // Create new task
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

  const handleEdit = (task: typeof editingTask) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingTask(null);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: 'a_fazer' | 'fazendo' | 'feito') => {
    const { error } = await updateTaskStatus(taskId, newStatus);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar tarefa' });
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

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div key={column.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${column.color}`} />
                  {column.title}
                </h3>
                <span className="text-sm text-muted-foreground">{columnTasks.length}</span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {isLoading ? (
                  [...Array(2)].map((_, i) => <TaskCardSkeleton key={i} />)
                ) : (
                  <>
                    {columnTasks.map((task) => (
                      <Card key={task.id} className="hover-lift">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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

                          {/* Status buttons */}
                          <div className="flex gap-1 pt-2 border-t">
                            {columns.map((col) => (
                              <Button
                                key={col.id}
                                variant={task.status === col.id ? 'default' : 'ghost'}
                                size="sm"
                                className="flex-1 h-7 text-xs"
                                onClick={() => handleStatusChange(task.id, col.id)}
                              >
                                {col.title}
                              </Button>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleEdit({
                                id: task.id,
                                title: task.title,
                                description: task.description,
                                priority: task.priority,
                                due_date: task.due_date,
                                assigned_to: task.assigned_to,
                                client_id: task.client_id,
                              })}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteDialog({ open: true, taskId: task.id, taskTitle: task.title })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {columnTasks.length === 0 && (
                      <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                        <p className="text-sm text-muted-foreground">Nenhuma tarefa</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
