import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/layout/EmptyState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { VisitFormDialog, VisitFormValues } from '@/components/forms/VisitFormDialog';
import { VisitCard } from '@/components/filmmaker/VisitCard';
import { 
  Plus, 
  Video, 
  Clock, 
  CheckCircle, 
  XCircle,
  Search,
  Filter,
  Calendar as CalendarIcon,
  LayoutGrid,
  List
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'agendada' | 'realizada' | 'cancelada'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const matchesSearch = 
        visit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visit.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        visit.location?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [visits, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: visits.length,
    agendada: visits.filter(v => v.status === 'agendada').length,
    realizada: visits.filter(v => v.status === 'realizada').length,
    cancelada: visits.filter(v => v.status === 'cancelada').length,
  }), [visits]);

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/30 to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="relative px-6 py-8 md:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Video className="h-4 w-4" />
                  <span>Filmmaker</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  Visitas
                </h1>
                <p className="text-muted-foreground max-w-md">
                  Gerencie suas visitas de filmagem e acompanhe o status de cada uma.
                </p>
              </div>
              
              {canCreate && (
                <Button 
                  size="lg" 
                  className="gap-2 shadow-lg shadow-primary/20 h-12 px-6"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="h-5 w-5" />
                  Nova Visita
                </Button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <StatCard
                label="Total"
                value={stats.total}
                icon={CalendarIcon}
                active={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              <StatCard
                label="Agendadas"
                value={stats.agendada}
                icon={Clock}
                color="amber"
                active={statusFilter === 'agendada'}
                onClick={() => setStatusFilter('agendada')}
              />
              <StatCard
                label="Realizadas"
                value={stats.realizada}
                icon={CheckCircle}
                color="emerald"
                active={statusFilter === 'realizada'}
                onClick={() => setStatusFilter('realizada')}
              />
              <StatCard
                label="Canceladas"
                value={stats.cancelada}
                icon={XCircle}
                color="red"
                active={statusFilter === 'cancelada'}
                onClick={() => setStatusFilter('cancelada')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar visitas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-muted/30 border-border/50"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                <TabsList className="h-10 bg-muted/50">
                  <TabsTrigger value="grid" className="gap-2 px-3">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Grade</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2 px-3">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Lista</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredVisits.length} {filteredVisits.length === 1 ? 'visita encontrada' : 'visitas encontradas'}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="ml-2 gap-1">
                  {statusFilter === 'agendada' && <Clock className="h-3 w-3" />}
                  {statusFilter === 'realizada' && <CheckCircle className="h-3 w-3" />}
                  {statusFilter === 'cancelada' && <XCircle className="h-3 w-3" />}
                  {statusFilter}
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </p>
          </div>

          {/* Visits Grid/List */}
          {filteredVisits.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={Video}
                title={searchQuery || statusFilter !== 'all' ? "Nenhuma visita encontrada" : "Nenhuma visita ainda"}
                description={searchQuery || statusFilter !== 'all' 
                  ? "Tente ajustar os filtros de busca" 
                  : "Crie sua primeira visita para começar"}
              />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  viewMode === 'grid' 
                    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    : "space-y-3"
                )}
              >
                {filteredVisits.map((visit, index) => (
                  <motion.div
                    key={visit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <VisitCard
                      visit={visit}
                      onEdit={handleEdit}
                      onDelete={(id, title) => setConfirmDialog({ open: true, id, title })}
                      canDelete={isAdminOrManager}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

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

// Stat Card Component
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: 'amber' | 'emerald' | 'red';
  active?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, icon: Icon, color, active, onClick }: StatCardProps) {
  const colorClasses = {
    amber: 'text-amber-600 dark:text-amber-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start p-4 rounded-2xl border transition-all duration-200",
        "bg-card/50 backdrop-blur-sm hover:bg-card/80",
        active 
          ? "border-primary/50 ring-2 ring-primary/20 shadow-lg shadow-primary/10" 
          : "border-border/40 hover:border-border"
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className={cn("h-4 w-4", color && colorClasses[color])} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <span className={cn(
        "text-2xl font-bold tabular-nums",
        color && colorClasses[color]
      )}>
        {value}
      </span>
    </button>
  );
}
