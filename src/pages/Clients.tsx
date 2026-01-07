import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Building2, Users, Palette, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { CardSkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';
import { StatsCard } from '@/components/layout/StatsCard';
import { ClientFormDialog, ClientFormValues } from '@/components/forms/ClientFormDialog';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientListItem } from '@/components/clients/ClientListItem';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { useClients } from '@/hooks/useClients';
import { Skeleton } from '@/components/ui/skeleton';

type TaskCountMap = Record<string, { pending: number; total: number }>;

export default function Clients() {
  const { clients, isLoading, error, refetch } = useClients();
  const [search, setSearch] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskCounts, setTaskCounts] = useState<TaskCountMap>({});
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch task counts per client
  useEffect(() => {
    const fetchTaskCounts = async () => {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('client_id, status')
        .not('client_id', 'is', null);

      if (tasks) {
        const counts: TaskCountMap = {};
        tasks.forEach(task => {
          if (task.client_id) {
            if (!counts[task.client_id]) {
              counts[task.client_id] = { pending: 0, total: 0 };
            }
            counts[task.client_id].total++;
            if (task.status !== 'feito') {
              counts[task.client_id].pending++;
            }
          }
        });
        setTaskCounts(counts);
      }
    };

    fetchTaskCounts();
  }, [clients]);
  // Extract unique segments
  const segments = useMemo(() => {
    const segmentSet = new Set<string>();
    clients.forEach(client => {
      if (client.segment) {
        segmentSet.add(client.segment);
      }
    });
    return Array.from(segmentSet).sort();
  }, [clients]);

  // Calculate stats
  const stats = useMemo(() => {
    const withPalette = clients.filter(c => c.color_palette.length > 0).length;
    const withLinks = clients.filter(c => c.google_drive_link || c.trello_link).length;
    return {
      total: clients.length,
      segments: segments.length,
      withPalette,
      withLinks,
    };
  }, [clients, segments]);

  const handleSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);
    const { error } = await supabase.from('clients').insert({
      name: data.name,
      segment: data.segment || null,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      google_drive_link: data.google_drive_link || null,
      trello_link: data.trello_link || null,
      notes: data.notes || null,
      created_by: user?.id,
    });
    setIsSubmitting(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao criar cliente', description: error.message });
    } else {
      toast({ title: 'Cliente criado com sucesso!' });
      setIsDialogOpen(false);
      refetch();
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.segment?.toLowerCase().includes(search.toLowerCase()) ||
        client.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        client.contact_email?.toLowerCase().includes(search.toLowerCase());
      
      const matchesSegment = selectedSegment === null || client.segment === selectedSegment;
      
      return matchesSearch && matchesSegment;
    });
  }, [clients, search, selectedSegment]);

  if (error) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader 
          title="Clientes" 
          description="Gerencie os clientes da sua agência" 
        />
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
        title="Clientes" 
        description="Gerencie os clientes da sua agência"
        action={
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        }
      />

      {/* Form Dialog */}
      <ClientFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Clientes"
            value={stats.total}
            icon={Building2}
            subtitle="clientes ativos"
          />
          <StatsCard
            title="Segmentos"
            value={stats.segments}
            icon={Users}
            subtitle="categorias diferentes"
          />
          <StatsCard
            title="Com Paleta"
            value={stats.withPalette}
            icon={Palette}
            subtitle={`${stats.total > 0 ? Math.round((stats.withPalette / stats.total) * 100) : 0}% do total`}
          />
          <StatsCard
            title="Com Links"
            value={stats.withLinks}
            icon={Link2}
            subtitle="Drive ou Trello"
          />
        </div>
      )}

      {/* Filters */}
      <ClientFilters
        search={search}
        onSearchChange={setSearch}
        segments={segments}
        selectedSegment={selectedSegment}
        onSegmentChange={setSelectedSegment}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Loading State */}
      {isLoading ? (
        <div className={viewMode === 'grid' 
          ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" 
          : "space-y-3"
        }>
          {[...Array(6)].map((_, i) => (
            viewMode === 'grid' ? (
              <CardSkeleton key={i} />
            ) : (
              <Skeleton key={i} className="h-20 rounded-xl" />
            )
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <EmptyState
              icon={Building2}
              title="Nenhum cliente encontrado"
              description={search || selectedSegment ? 'Tente outro filtro' : 'Adicione seu primeiro cliente'}
            />
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <ClientCard 
              key={client.id} 
              client={client}
              taskCount={taskCounts[client.id]}
              onClick={() => navigate(`/clients/${client.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <ClientListItem
              key={client.id}
              client={client}
              taskCount={taskCounts[client.id]}
              onClick={() => navigate(`/clients/${client.id}`)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && filteredClients.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Exibindo {filteredClients.length} de {clients.length} clientes
        </p>
      )}
    </div>
  );
}