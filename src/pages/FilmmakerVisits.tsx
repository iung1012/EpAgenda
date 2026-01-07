import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/layout/StatsCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { VisitFormDialog, VisitFormValues } from '@/components/forms/VisitFormDialog';
import { Plus, MapPin, Calendar, Video, Package, Clock, CheckCircle, XCircle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
  description: string | null;
}

interface Visit {
  id: string;
  filmmaker_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  visit_date: string;
  status: 'agendada' | 'realizada' | 'cancelada';
  notes: string | null;
  created_at: string;
  client?: Client | null;
  equipment?: Equipment[];
}

export default function FilmmakerVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
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
    const [visitsRes, clientsRes, equipmentRes] = await Promise.all([
      supabase.from('filmmaker_visits').select('*').order('visit_date', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('equipment').select('*').order('name'),
    ]);

    if (clientsRes.data) setClients(clientsRes.data);
    if (equipmentRes.data) setEquipment(equipmentRes.data);

    if (visitsRes.data) {
      const visitsWithDetails = await Promise.all(
        visitsRes.data.map(async (visit) => {
          const client = clientsRes.data?.find(c => c.id === visit.client_id) || null;
          
          const { data: visitEquipment } = await supabase
            .from('visit_equipment')
            .select('equipment_id')
            .eq('visit_id', visit.id);
          
          const equipmentItems = visitEquipment?.map(ve => 
            equipmentRes.data?.find(e => e.id === ve.equipment_id)
          ).filter(Boolean) as Equipment[] || [];

          return { ...visit, client, equipment: equipmentItems } as Visit;
        })
      );
      setVisits(visitsWithDetails);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (data: VisitFormValues) => {
    setIsLoading(true);

    try {
      if (editingVisit) {
        const { error } = await supabase
          .from('filmmaker_visits')
          .update({
            title: data.title,
            description: data.description || null,
            location: data.location || null,
            visit_date: data.visit_date,
            client_id: data.client_id || null,
            status: data.status,
            notes: data.notes || null,
          })
          .eq('id', editingVisit.id);

        if (error) throw error;

        await supabase.from('visit_equipment').delete().eq('visit_id', editingVisit.id);
        
        if (data.equipment_ids.length > 0) {
          await supabase.from('visit_equipment').insert(
            data.equipment_ids.map(eq_id => ({
              visit_id: editingVisit.id,
              equipment_id: eq_id,
            }))
          );
        }

        toast({ title: 'Visita atualizada com sucesso!' });
      } else {
        const { data: newVisit, error } = await supabase
          .from('filmmaker_visits')
          .insert({
            filmmaker_id: user?.id,
            title: data.title,
            description: data.description || null,
            location: data.location || null,
            visit_date: data.visit_date,
            client_id: data.client_id || null,
            status: data.status,
            notes: data.notes || null,
          })
          .select()
          .single();

        if (error) throw error;

        if (newVisit && data.equipment_ids.length > 0) {
          await supabase.from('visit_equipment').insert(
            data.equipment_ids.map(eq_id => ({
              visit_id: newVisit.id,
              equipment_id: eq_id,
            }))
          );
        }

        toast({ title: 'Visita criada com sucesso!' });
      }

      setIsDialogOpen(false);
      setEditingVisit(null);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar visita', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (visit: Visit) => {
    setEditingVisit(visit);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('filmmaker_visits').delete().eq('id', confirmDialog.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir visita', description: error.message });
    } else {
      toast({ title: 'Visita excluída com sucesso!' });
      fetchData();
    }
    setConfirmDialog({ open: false, id: '', title: '' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge variant="outline" className="gap-1 text-xs"><Clock className="h-3 w-3" /> Agendada</Badge>;
      case 'realizada':
        return <Badge className="gap-1 text-xs bg-green-600 hover:bg-green-600"><CheckCircle className="h-3 w-3" /> Realizada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="h-3 w-3" /> Cancelada</Badge>;
      default:
        return null;
    }
  };

  const groupedVisits = {
    agendada: visits.filter(v => v.status === 'agendada'),
    realizada: visits.filter(v => v.status === 'realizada'),
    cancelada: visits.filter(v => v.status === 'cancelada'),
  };

  const getDefaultValues = (): Partial<VisitFormValues> | undefined => {
    if (!editingVisit) return undefined;
    return {
      title: editingVisit.title,
      description: editingVisit.description || '',
      location: editingVisit.location || '',
      visit_date: editingVisit.visit_date.slice(0, 16),
      client_id: editingVisit.client_id || '',
      status: editingVisit.status,
      notes: editingVisit.notes || '',
      equipment_ids: editingVisit.equipment?.map(e => e.id) || [],
    };
  };

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Visitas"
        description="Gerencie suas visitas de filmagem"
        action={
          canCreate && (
            <Button size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova Visita
            </Button>
          )
        }
      />

      {/* Form Dialog */}
      <VisitFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingVisit(null);
        }}
        onSubmit={handleSubmit}
        defaultValues={getDefaultValues()}
        clients={clients}
        equipment={equipment}
        isEditing={!!editingVisit}
        isLoading={isLoading}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Agendadas"
          value={groupedVisits.agendada.length}
          icon={Clock}
        />
        <StatsCard
          title="Realizadas"
          value={groupedVisits.realizada.length}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="Canceladas"
          value={groupedVisits.cancelada.length}
          icon={XCircle}
          variant="destructive"
        />
      </div>

      {/* Visits List */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Todas as Visitas
        </h2>
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          {visits.length === 0 ? (
            <EmptyState
              icon={Video}
              title="Nenhuma visita encontrada"
              description="Crie uma nova visita para começar"
            />
          ) : (
            <div className="divide-y divide-border/50">
              {visits.map((visit) => (
                <div key={visit.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-sm">{visit.title}</h3>
                        {getStatusBadge(visit.status)}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(visit.visit_date), "dd MMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                        {visit.client && (
                          <span>{visit.client.name}</span>
                        )}
                        {visit.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {visit.location}
                          </span>
                        )}
                      </div>

                      {visit.equipment && visit.equipment.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {visit.equipment.map((eq) => (
                            <span key={eq.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              <Package className="h-3 w-3" />
                              {eq.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => handleEdit(visit)}>
                        <Pencil className="h-3 w-3" />
                        Editar
                      </Button>
                      {isAdminOrManager && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-7 gap-1 text-destructive hover:text-destructive" 
                          onClick={() => setConfirmDialog({ open: true, id: visit.id, title: visit.title })}
                        >
                          <Trash2 className="h-3 w-3" />
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title="Excluir visita"
        description={`Tem certeza que deseja excluir "${confirmDialog.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
