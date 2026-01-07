import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/layout/StatsCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { Plus, Film, Clock, CheckCircle, RefreshCw, Calendar } from 'lucide-react';
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
  status: 'em_processo' | 'terminado' | 'alteracoes';
  due_date: string | null;
  created_at: string;
  client?: Client | null;
  visit?: Visit | null;
}

interface DemandForm {
  title: string;
  description: string;
  client_id: string;
  visit_id: string;
  status: 'em_processo' | 'terminado' | 'alteracoes';
  due_date: string;
}

const initialForm: DemandForm = {
  title: '',
  description: '',
  client_id: '',
  visit_id: '',
  status: 'em_processo',
  due_date: '',
};

export default function FilmmakerDemands() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [form, setForm] = useState<DemandForm>(initialForm);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast({ variant: 'destructive', title: 'Preencha o título' });
      return;
    }

    setIsLoading(true);

    try {
      if (editingDemand) {
        const { error } = await supabase
          .from('filmmaker_demands')
          .update({
            title: form.title,
            description: form.description || null,
            client_id: form.client_id || null,
            visit_id: form.visit_id || null,
            status: form.status,
            due_date: form.due_date || null,
          })
          .eq('id', editingDemand.id);

        if (error) throw error;
        toast({ title: 'Demanda atualizada com sucesso!' });
      } else {
        const { error } = await supabase
          .from('filmmaker_demands')
          .insert({
            filmmaker_id: user?.id,
            title: form.title,
            description: form.description || null,
            client_id: form.client_id || null,
            visit_id: form.visit_id || null,
            status: form.status,
            due_date: form.due_date || null,
          });

        if (error) throw error;
        toast({ title: 'Demanda criada com sucesso!' });
      }

      setIsDialogOpen(false);
      setEditingDemand(null);
      setForm(initialForm);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar demanda', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (demand: Demand) => {
    setEditingDemand(demand);
    setForm({
      title: demand.title,
      description: demand.description || '',
      client_id: demand.client_id || '',
      visit_id: demand.visit_id || '',
      status: demand.status,
      due_date: demand.due_date || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (demandId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta demanda?')) return;

    const { error } = await supabase.from('filmmaker_demands').delete().eq('id', demandId);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir demanda', description: error.message });
    } else {
      toast({ title: 'Demanda excluída com sucesso!' });
      fetchData();
    }
  };

  const handleStatusChange = async (demandId: string, newStatus: 'em_processo' | 'terminado' | 'alteracoes') => {
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
    em_processo: demands.filter(d => d.status === 'em_processo'),
    alteracoes: demands.filter(d => d.status === 'alteracoes'),
    terminado: demands.filter(d => d.status === 'terminado'),
  };

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Demandas"
        description="Gerencie suas demandas de produção"
        action={
          canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingDemand(null);
                setForm(initialForm);
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Demanda
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingDemand ? 'Editar Demanda' : 'Nova Demanda'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Título da demanda"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={form.status}
                        onValueChange={(value: 'em_processo' | 'terminado' | 'alteracoes') => setForm({ ...form, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="em_processo">Em Processo</SelectItem>
                          <SelectItem value="terminado">Terminado</SelectItem>
                          <SelectItem value="alteracoes">Alterações</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prazo</Label>
                      <Input
                        type="date"
                        value={form.due_date}
                        onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                      value={form.client_id}
                      onValueChange={(value) => setForm({ ...form, client_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Visita Relacionada</Label>
                    <Select
                      value={form.visit_id}
                      onValueChange={(value) => setForm({ ...form, visit_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma visita" />
                      </SelectTrigger>
                      <SelectContent>
                        {visits.map((visit) => (
                          <SelectItem key={visit.id} value={visit.id}>
                            {visit.title} - {format(new Date(visit.visit_date), 'dd/MM/yyyy')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Detalhes da demanda"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Salvando...' : (editingDemand ? 'Salvar' : 'Criar')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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
                        onValueChange={(value: 'em_processo' | 'terminado' | 'alteracoes') => handleStatusChange(demand.id, value)}
                      >
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="em_processo">Em Processo</SelectItem>
                          <SelectItem value="terminado">Terminado</SelectItem>
                          <SelectItem value="alteracoes">Alterações</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => handleEdit(demand)}>
                        Editar
                      </Button>
                      {isAdminOrManager && (
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={() => handleDelete(demand.id)}>
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
