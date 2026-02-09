import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Building2, Users, Palette, Link2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/layout/EmptyState';
import { ErrorState } from '@/components/layout/ErrorState';
import { ClientFormDialog, ClientFormValues } from '@/components/forms/ClientFormDialog';
import { ClientCard } from '@/components/clients/ClientCard';
import { ClientListItem } from '@/components/clients/ClientListItem';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { useClients } from '@/hooks/useClients';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

type TaskCountMap = Record<string, { pending: number; total: number }>;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const statsConfig = [
  { key: 'total', label: 'Clientes', icon: Building2, color: 'bg-primary/10 text-primary' },
  { key: 'segments', label: 'Segmentos', icon: Users, color: 'bg-info/10 text-info' },
  { key: 'withPalette', label: 'Com Paleta', icon: Palette, color: 'bg-success/10 text-success' },
  { key: 'withLinks', label: 'Com Links', icon: Link2, color: 'bg-warning/10 text-warning' },
] as const;

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

  const segments = useMemo(() => {
    const segmentSet = new Set<string>();
    clients.forEach(client => {
      if (client.segment) segmentSet.add(client.segment);
    });
    return Array.from(segmentSet).sort();
  }, [clients]);

  const stats = useMemo(() => {
    const withPalette = clients.filter(c => c.color_palette.length > 0).length;
    const withLinks = clients.filter(c => c.google_drive_link || c.trello_link).length;
    return { total: clients.length, segments: segments.length, withPalette, withLinks };
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
      canva_link: data.canva_link || null,
      notes: data.notes || null,
      custom_links: data.custom_links || [],
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        </div>
        <Card><CardContent className="pt-6"><ErrorState onRetry={refetch} /></CardContent></Card>
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <Building2 className="h-4 w-4" />
            <span>Gestão</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            {isLoading ? 'Carregando...' : `${clients.length} clientes cadastrados na agência`}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="lg" className="gap-2 rounded-xl shadow-sm">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </motion.div>

      <ClientFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      {/* Stats Strip */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          statsConfig.map((s) => {
            const Icon = s.icon;
            const value = stats[s.key];
            return (
              <div 
                key={s.key}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`p-2.5 rounded-xl ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            );
          })
        )}
      </motion.div>

      {/* Productivity indicator */}
      {!isLoading && stats.total > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
            <TrendingUp className="h-4 w-4 text-success" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Clientes com paleta e links configurados</span>
                <span className="text-xs font-semibold">
                  {stats.total > 0 ? Math.round(((stats.withPalette + stats.withLinks) / (stats.total * 2)) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div 
                  className="h-full rounded-full bg-success transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? Math.round(((stats.withPalette + stats.withLinks) / (stats.total * 2)) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <ClientFilters
          search={search}
          onSearchChange={setSearch}
          segments={segments}
          selectedSegment={selectedSegment}
          onSegmentChange={setSelectedSegment}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </motion.div>

      {/* Client List */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className={viewMode === 'grid' ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className={viewMode === 'grid' ? "h-52 rounded-xl" : "h-20 rounded-xl"} />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16">
              <EmptyState
                icon={Building2}
                title="Nenhum cliente encontrado"
                description={search || selectedSegment ? 'Tente outro filtro ou termo de busca' : 'Adicione seu primeiro cliente para começar'}
              />
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <motion.div 
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {filteredClients.map((client) => (
              <motion.div key={client.id} variants={itemVariants}>
                <ClientCard 
                  client={client}
                  taskCount={taskCounts[client.id]}
                  onClick={() => navigate(`/clients/${client.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            className="space-y-2"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {filteredClients.map((client) => (
              <motion.div key={client.id} variants={itemVariants}>
                <ClientListItem
                  client={client}
                  taskCount={taskCounts[client.id]}
                  onClick={() => navigate(`/clients/${client.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Results count */}
      {!isLoading && filteredClients.length > 0 && (
        <motion.p variants={itemVariants} className="text-xs text-muted-foreground text-center pb-4">
          Exibindo {filteredClients.length} de {clients.length} clientes
        </motion.p>
      )}
    </motion.div>
  );
}
