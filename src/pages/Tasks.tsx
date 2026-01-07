import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Clock, User, Building2, CheckSquare, ListTodo, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/layout/StatsCard';
import { TaskCardSkeleton, StatsSkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';

type TaskStatus = 'a_fazer' | 'fazendo' | 'feito';
type TaskPriority = 'baixa' | 'media' | 'alta';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  client_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
}

interface Profile {
  user_id: string;
  full_name: string;
}

interface Client {
  id: string;
  name: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'media' as TaskPriority,
    due_date: '',
    assigned_to: '',
    client_id: '',
  });

  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    if (data) {
      setTasks(data as Task[]);
    }
    setIsLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('user_id, full_name');
    if (data) {
      setProfiles(data);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    if (data) {
      setClients(data);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast({ variant: 'destructive', title: 'Título é obrigatório' });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from('tasks').insert({
      title: formData.title,
      description: formData.description || null,
      priority: formData.priority,
      due_date: formData.due_date || null,
      assigned_to: formData.assigned_to || null,
      client_id: formData.client_id || null,
      created_by: user?.id,
      status: 'a_fazer',
    });
    setIsSubmitting(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao criar tarefa', description: error.message });
    } else {
      toast({ title: 'Tarefa criada com sucesso!' });
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        priority: 'media',
        due_date: '',
        assigned_to: '',
        client_id: '',
      });
      fetchTasks();
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar tarefa' });
    } else {
      fetchTasks();
    }
  };

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.full_name || null;
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
    { id: 'a_fazer' as TaskStatus, title: 'A Fazer', color: 'bg-muted' },
    { id: 'fazendo' as TaskStatus, title: 'Fazendo', color: 'bg-info/10' },
    { id: 'feito' as TaskStatus, title: 'Feito', color: 'bg-success/10' },
  ];

  if (error) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader title="Tarefas" description="Gerencie as tarefas da equipe" />
        <Card>
          <CardContent className="pt-6">
            <ErrorState onRetry={fetchTasks} />
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título da tarefa"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalhes da tarefa..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: TaskPriority) => setFormData({ ...formData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Prazo</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Criar Tarefa'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
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
    </div>
  );
}
