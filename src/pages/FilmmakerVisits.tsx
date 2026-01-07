import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin, Calendar, Video, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
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

interface VisitForm {
  title: string;
  description: string;
  location: string;
  visit_date: string;
  client_id: string;
  status: 'agendada' | 'realizada' | 'cancelada';
  notes: string;
  equipment_ids: string[];
}

const initialForm: VisitForm = {
  title: '',
  description: '',
  location: '',
  visit_date: '',
  client_id: '',
  status: 'agendada',
  notes: '',
  equipment_ids: [],
};

export default function FilmmakerVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [form, setForm] = useState<VisitForm>(initialForm);
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
      // Fetch equipment for each visit
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.visit_date) {
      toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios' });
      return;
    }

    setIsLoading(true);

    try {
      if (editingVisit) {
        // Update visit
        const { error } = await supabase
          .from('filmmaker_visits')
          .update({
            title: form.title,
            description: form.description || null,
            location: form.location || null,
            visit_date: form.visit_date,
            client_id: form.client_id || null,
            status: form.status,
            notes: form.notes || null,
          })
          .eq('id', editingVisit.id);

        if (error) throw error;

        // Update equipment
        await supabase.from('visit_equipment').delete().eq('visit_id', editingVisit.id);
        
        if (form.equipment_ids.length > 0) {
          await supabase.from('visit_equipment').insert(
            form.equipment_ids.map(eq_id => ({
              visit_id: editingVisit.id,
              equipment_id: eq_id,
            }))
          );
        }

        toast({ title: 'Visita atualizada com sucesso!' });
      } else {
        // Create visit
        const { data, error } = await supabase
          .from('filmmaker_visits')
          .insert({
            filmmaker_id: user?.id,
            title: form.title,
            description: form.description || null,
            location: form.location || null,
            visit_date: form.visit_date,
            client_id: form.client_id || null,
            status: form.status,
            notes: form.notes || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Add equipment
        if (data && form.equipment_ids.length > 0) {
          await supabase.from('visit_equipment').insert(
            form.equipment_ids.map(eq_id => ({
              visit_id: data.id,
              equipment_id: eq_id,
            }))
          );
        }

        toast({ title: 'Visita criada com sucesso!' });
      }

      setIsDialogOpen(false);
      setEditingVisit(null);
      setForm(initialForm);
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar visita', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (visit: Visit) => {
    setEditingVisit(visit);
    setForm({
      title: visit.title,
      description: visit.description || '',
      location: visit.location || '',
      visit_date: visit.visit_date.slice(0, 16),
      client_id: visit.client_id || '',
      status: visit.status,
      notes: visit.notes || '',
      equipment_ids: visit.equipment?.map(e => e.id) || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (visitId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta visita?')) return;

    const { error } = await supabase.from('filmmaker_visits').delete().eq('id', visitId);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir visita', description: error.message });
    } else {
      toast({ title: 'Visita excluída com sucesso!' });
      fetchData();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Agendada</Badge>;
      case 'realizada':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Realizada</Badge>;
      case 'cancelada':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Cancelada</Badge>;
      default:
        return null;
    }
  };

  const groupedVisits = {
    agendada: visits.filter(v => v.status === 'agendada'),
    realizada: visits.filter(v => v.status === 'realizada'),
    cancelada: visits.filter(v => v.status === 'cancelada'),
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Visitas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas visitas de filmagem
          </p>
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingVisit(null);
              setForm(initialForm);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Visita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingVisit ? 'Editar Visita' : 'Nova Visita'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Título da visita"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data e Hora *</Label>
                    <Input
                      type="datetime-local"
                      value={form.visit_date}
                      onChange={(e) => setForm({ ...form, visit_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value: 'agendada' | 'realizada' | 'cancelada') => setForm({ ...form, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendada">Agendada</SelectItem>
                        <SelectItem value="realizada">Realizada</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Label>Local</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Endereço ou local da visita"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Detalhes da visita"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Equipamentos</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                    {equipment.map((eq) => (
                      <div key={eq.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={eq.id}
                          checked={form.equipment_ids.includes(eq.id)}
                          onCheckedChange={(checked) => {
                            setForm({
                              ...form,
                              equipment_ids: checked
                                ? [...form.equipment_ids, eq.id]
                                : form.equipment_ids.filter(id => id !== eq.id),
                            });
                          }}
                        />
                        <label htmlFor={eq.id} className="text-sm cursor-pointer">
                          {eq.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Notas adicionais"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Salvando...' : (editingVisit ? 'Salvar' : 'Criar')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{groupedVisits.agendada.length}</p>
                <p className="text-sm text-muted-foreground">Agendadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{groupedVisits.realizada.length}</p>
                <p className="text-sm text-muted-foreground">Realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{groupedVisits.cancelada.length}</p>
                <p className="text-sm text-muted-foreground">Canceladas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visits List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Todas as Visitas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma visita encontrada
            </p>
          ) : (
            <div className="space-y-4">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className="p-4 rounded-xl bg-secondary/30 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{visit.title}</h3>
                        {getStatusBadge(visit.status)}
                      </div>
                      {visit.client && (
                        <p className="text-sm text-muted-foreground">
                          Cliente: {visit.client.name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(visit)}>
                        Editar
                      </Button>
                      {isAdminOrManager && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(visit.id)}>
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(visit.visit_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {visit.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {visit.location}
                      </span>
                    )}
                  </div>

                  {visit.equipment && visit.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <Package className="h-4 w-4 text-muted-foreground mr-1" />
                      {visit.equipment.map((eq) => (
                        <Badge key={eq.id} variant="outline" className="text-xs">
                          {eq.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {visit.description && (
                    <p className="text-sm text-muted-foreground">{visit.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
