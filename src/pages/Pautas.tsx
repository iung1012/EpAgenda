import { useState, useMemo } from 'react';
import { Plus, FileText, ChevronDown, Pencil, Trash2, Check, Circle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { PautaFormDialog, PautaFormValues } from '@/components/forms/PautaFormDialog';
import { usePautas, Pauta } from '@/hooks/usePautas';
import { useClients } from '@/hooks/useClients';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function Pautas() {
  const { pautas, refetch } = usePautas();
  const { clients } = useClients({ minimal: true });
  const { tasks, refetch: refetchTasks } = useTasks();
  const { user, isAdminOrManager } = useAuth();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pauta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clientFilter, setClientFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: '', title: '' });
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [newTaskInput, setNewTaskInput] = useState<Record<string, string>>({});

  // Fetch tasks with pauta_id (need raw since useTasks doesn't expose it)
  const tasksWithPauta = tasks as any[];

  const filteredPautas = useMemo(() => pautas.filter(p =>
    clientFilter === 'all' || p.client_id === clientFilter
  ), [pautas, clientFilter]);

  const handleSubmit = async (data: PautaFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || null,
        client_id: data.client_id || null,
      };
      if (editing) {
        const { error } = await supabase.from('pautas').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Pauta atualizada!' });
      } else {
        const { error } = await supabase.from('pautas').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast({ title: 'Pauta criada!' });
      }
      setDialogOpen(false);
      setEditing(null);
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    // Unlink tasks first
    await (supabase.from('tasks') as any).update({ pauta_id: null }).eq('pauta_id', confirmDelete.id);
    const { error } = await supabase.from('pautas').delete().eq('id', confirmDelete.id);
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
    else { toast({ title: 'Pauta excluída' }); refetch(); refetchTasks(); }
    setConfirmDelete({ open: false, id: '', title: '' });
  };

  const addTask = async (pautaId: string) => {
    const title = (newTaskInput[pautaId] || '').trim();
    if (!title || !user) return;
    const pauta = pautas.find(p => p.id === pautaId);
    const { error } = await supabase.from('tasks').insert({
      title,
      created_by: user.id,
      status: 'a_fazer',
      priority: 'media',
      assigned_to: user.id,
      client_id: pauta?.client_id || null,
      pauta_id: pautaId,
    } as any);
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
    else {
      setNewTaskInput(p => ({ ...p, [pautaId]: '' }));
      refetchTasks();
    }
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'feito' ? 'a_fazer' : 'feito';
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    if (error) toast({ variant: 'destructive', title: 'Erro' });
    else refetchTasks();
  };

  const getDefaultValues = (): Partial<PautaFormValues> | undefined => {
    if (!editing) return undefined;
    return {
      title: editing.title,
      description: editing.description || '',
      client_id: editing.client_id || '',
    };
  };

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Pautas"
        description="Agrupe tarefas por pauta de conteúdo"
        action={
          <Button size="sm" className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Nova Pauta
          </Button>
        }
      />

      <div className="flex gap-2 flex-wrap">
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos clientes</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filteredPautas.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="Nenhuma pauta ainda"
            description="Crie sua primeira pauta para agrupar tarefas por tema"
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPautas.map(pauta => {
            const client = clients.find(c => c.id === pauta.client_id);
            const pautaTasks = tasksWithPauta.filter(t => t.pauta_id === pauta.id);
            const done = pautaTasks.filter(t => t.status === 'feito').length;
            const isOpen = !!openItems[pauta.id];
            return (
              <Card key={pauta.id} className="overflow-hidden">
                <Collapsible open={isOpen} onOpenChange={(o) => setOpenItems(s => ({ ...s, [pauta.id]: o }))}>
                  <div className="flex items-center gap-2 p-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 justify-start gap-3 -ml-2 hover:bg-transparent">
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                        <div className="flex-1 text-left">
                          <div className="font-semibold flex items-center gap-2 flex-wrap">
                            {pauta.title}
                            {client && <Badge variant="outline" className="text-[10px]">{client.name}</Badge>}
                          </div>
                          {pauta.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pauta.description}</p>}
                        </div>
                        <Badge variant="secondary" className="text-xs">{done}/{pautaTasks.length}</Badge>
                      </Button>
                    </CollapsibleTrigger>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(pauta); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {(pauta.created_by === user?.id || isAdminOrManager) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete({ open: true, id: pauta.id, title: pauta.title })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-2 border-t pt-3">
                      {pautaTasks.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">Nenhuma tarefa vinculada.</p>
                      )}
                      {pautaTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2 text-sm py-1">
                          <button onClick={() => toggleTask(task.id, task.status)} className="flex-shrink-0">
                            {task.status === 'feito' ? <Check className="h-4 w-4 text-emerald-500" /> :
                             task.status === 'fazendo' ? <Loader2 className="h-4 w-4 text-blue-500" /> :
                             <Circle className="h-4 w-4 text-muted-foreground" />}
                          </button>
                          <span className={cn("flex-1", task.status === 'feito' && "line-through text-muted-foreground")}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                      <form onSubmit={(e) => { e.preventDefault(); addTask(pauta.id); }} className="flex gap-2 pt-2">
                        <Input
                          placeholder="Nova tarefa..."
                          value={newTaskInput[pauta.id] || ''}
                          onChange={(e) => setNewTaskInput(s => ({ ...s, [pauta.id]: e.target.value }))}
                          className="h-8 text-sm"
                        />
                        <Button type="submit" size="sm" className="h-8">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      <PautaFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        onSubmit={handleSubmit}
        defaultValues={getDefaultValues()}
        clients={clients}
        isEditing={!!editing}
        isLoading={isLoading}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(o) => setConfirmDelete(p => ({ ...p, open: o }))}
        title="Excluir pauta"
        description={`Excluir "${confirmDelete.title}"? As tarefas vinculadas serão desvinculadas, não excluídas.`}
        confirmText="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
