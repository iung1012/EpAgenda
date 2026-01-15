import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/layout/StatsCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { DemandFormDialog, DemandFormValues } from '@/components/forms/DemandFormDialog';
import { Plus, Film, Clock, CheckCircle, RefreshCw, Calendar, Pencil, Trash2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
}

interface Visit {
  id: string;
  title: string;
  visit_date: string;
}

interface Demand {
  id: string;
  filmmaker_id: string;
  client_id: string | null;
  visit_id: string | null;
  title: string;
  description: string | null;
  status: 'a_fazer' | 'em_processo' | 'terminado' | 'alteracoes';
  due_date: string | null;
  created_at: string;
  client?: Client | null;
  visit?: Visit | null;
}

export default function FilmmakerDemands() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string; title: string }>({
    open: false,
    id: '',
    title: '',
  });
  const { user, role, isAdminOrManager } = useAuth();
  const { toast } = useToast();

  const isFilmmaker = role === 'filmmaker';
  const canCreate = isFilmmaker || isAdminOrManager;

  const fetchData = async () => {
    const [demandsRes, clientsRes, visitsRes] = await Promise.all([
      supabase.from('filmmaker_demands').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('filmmaker_visits').select('id, title, visit_date').order('visit_date', { ascending: false }),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (visitsRes.data) setVisits(visitsRes.data);

    if (demandsRes.data) {
      const demandsWithDetails = demandsRes.data.map((demand) => {
        const client = clientsRes.data?.find(c => c.id === demand.client_id) || null;
        const visit = visitsRes.data?.find(v => v.id === demand.visit_id) || null;
        return { ...demand, client, visit } as Demand;
      });
      setDemands(demandsWithDetails);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (data: DemandFormValues) => {
    setIsLoading(true);

    try {
      if (editingDemand) {
        const { error } = await supabase
          .from('filmmaker_demands')
          .update({
            title: data.title,
            description: data.description || null,
            client_id: data.client_id || null,
            visit_id: data.visit_id || null,
            status: data.status,
            due_date: data.due_date || null,
          })
          .eq('id', editingDemand.id);

        if (error) throw error;
        toast({ title: 'Demanda atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('filmmaker_demands')
          .insert({
            filmmaker_id: user?.id,
            title: data.title,
            description: data.description || null,
            client_id: data.client_id || null,
            visit_id: data.visit_id || null,
            status: data.status,
            due_date: data.due_date || null,
          });

        if (error) throw error;
        toast({ title: 'Demanda criada com sucesso!' });
      }

      setIsDialogOpen(false);
      setEditingDemand(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar demanda', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (demand: Demand) => {
    setEditingDemand(demand);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await supabase.from('filmmaker_demands').delete().eq('id', confirmDialog.id);
    setIsDeleting(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir demanda', description: error.message });
    } else {
      toast({ title: 'Demanda excluída com sucesso!' });
      setConfirmDialog({ open: false, id: '', title: '' });
      fetchData();
    }
  };

  const handleStatusChange = async (demandId: string, newStatus: 'a_fazer' | 'em_processo' | 'terminado' | 'alteracoes') => {
    const { error } = await supabase
      .from('filmmaker_demands')
      .update({ status: newStatus })
      .eq('id', demandId);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar status', description: error.message });
    } else {
      toast({ title: 'Status atualizado!' });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'a_fazer':
        return <Badge variant="outline" className="gap-1 text-xs border-muted-foreground/50 text-muted-foreground"><Circle className="h-3 w-3" /> A Fazer</Badge>;
      case 'em_processo':
        return <Badge variant="outline" className="gap-1 text-xs border-blue-500/50 text-blue-600"><Clock className="h-3 w-3" /> Em Processo</Badge>;
      case 'terminado':
        return <Badge className="gap-1 text-xs bg-green-600 hover:bg-green-600"><CheckCircle className="h-3 w-3" /> Terminado</Badge>;
      case 'alteracoes':
        return <Badge variant="secondary" className="gap-1 text-xs text-orange-600"><RefreshCw className="h-3 w-3" /> Alterações</Badge>;
      default:
        return null;
    }
  };

  const groupedDemands = {
    a_fazer: demands.filter(d => d.status === 'a_fazer'),
    em_processo: demands.filter(d => d.status === 'em_processo'),
    alteracoes: demands.filter(d => d.status === 'alteracoes'),
    terminado: demands.filter(d => d.status === 'terminado'),
  };

  const getDefaultValues = (): Partial<DemandFormValues> | undefined => {
    if (!editingDemand) return undefined;
    return {
      title: editingDemand.title,
      description: editingDemand.description || '',
      client_id: editingDemand.client_id || '',
      visit_id: editingDemand.visit_id || '',
      status: editingDemand.status,
      due_date: editingDemand.due_date || '',
    };
  };

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Demandas"
        description="Gerencie suas demandas de produção"
        action={
          canCreate && (
            <Button size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova Demanda
            </Button>
          )
        }
      />

      {/* Form Dialog */}
      <DemandFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingDemand(null);
        }}
        onSubmit={handleSubmit}
        defaultValues={getDefaultValues()}
        clients={clients}
        visits={visits}
        isEditing={!!editingDemand}
        isLoading={isLoading}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatsCard
          title="A Fazer"
          value={groupedDemands.a_fazer.length}
          icon={Circle}
          variant="default"
        />
        <StatsCard
          title="Em Processo"
          value={groupedDemands.em_processo.length}
          icon={Clock}
          variant="info"
        />
        <StatsCard
          title="Alterações"
          value={groupedDemands.alteracoes.length}
          icon={RefreshCw}
          variant="warning"
        />
        <StatsCard
          title="Terminadas"
          value={groupedDemands.terminado.length}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Demands List */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Todas as Demandas
        </h2>
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          {demands.length === 0 ? (
            <EmptyState
              icon={Film}
              title="Nenhuma demanda encontrada"
              description="Crie uma nova demanda para começar"
            />
          ) : (
            <div className="divide-y divide-border/50">
              {demands.map((demand) => (
                <div key={demand.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{demand.title}</h3>
                        {getStatusBadge(demand.status)}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {demand.client && (
                          <span>{demand.client.name}</span>
                        )}
                        {demand.visit && (
                          <span>Visita: {demand.visit.title}</span>
                        )}
                        {demand.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(demand.due_date), "dd MMM", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      {demand.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{demand.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select
                        value={demand.status}
                        onValueChange={(value: 'a_fazer' | 'em_processo' | 'terminado' | 'alteracoes') => handleStatusChange(demand.id, value)}
                      >
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a_fazer">A Fazer</SelectItem>
                          <SelectItem value="em_processo">Em Processo</SelectItem>
                          <SelectItem value="terminado">Terminado</SelectItem>
                          <SelectItem value="alteracoes">Alterações</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => handleEdit(demand)}>
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-7 gap-1 text-destructive hover:text-destructive" 
                        onClick={() => setConfirmDialog({ open: true, id: demand.id, title: demand.title })}
                      >
                        <Trash2 className="h-3 w-3" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title="Excluir demanda"
        description={`Tem certeza que deseja excluir "${confirmDialog.title}"? Esta demanda também será removida do quadro de Tarefas. Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
