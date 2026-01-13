import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Calendar, CheckSquare, TrendingUp, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatsCard } from '@/components/layout/StatsCard';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface DashboardStats {
  totalClients: number;
  totalTasks: number;
  pendingTasks: number;
  todayEvents: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface UpcomingEvent {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalTasks: 0,
    pendingTasks: 0,
    todayEvents: 0,
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [clientsRes, tasksRes, pendingTasksRes, eventsRes, recentTasksRes, upcomingEventsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'feito'),
        supabase.from('calendar_events').select('id', { count: 'exact', head: true })
          .gte('start_date', today.toISOString())
          .lt('start_date', tomorrow.toISOString()),
        supabase.from('tasks').select('id, title, status, priority, due_date')
          .neq('status', 'feito')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('calendar_events').select('id, title, event_type, start_date')
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5),
      ]);

      setStats({
        totalClients: clientsRes.count || 0,
        totalTasks: tasksRes.count || 0,
        pendingTasks: pendingTasksRes.count || 0,
        todayEvents: eventsRes.count || 0,
      });

      if (recentTasksRes.data) {
        setRecentTasks(recentTasksRes.data);
      }

      if (upcomingEventsRes.data) {
        setUpcomingEvents(upcomingEventsRes.data);
      }
    };

    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'alta': return { label: 'Alta', className: 'text-red-600 dark:text-red-400 bg-red-500/10' };
      case 'media': return { label: 'Média', className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' };
      case 'baixa': return { label: 'Baixa', className: 'text-muted-foreground bg-muted' };
      default: return { label: priority, className: 'text-muted-foreground bg-muted' };
    }
  };

  const formatEventType = (type: string) => {
    switch (type) {
      case 'demanda': return { label: 'Demanda', color: 'bg-blue-500' };
      case 'visita': return { label: 'Visita', color: 'bg-emerald-500' };
      case 'reuniao': return { label: 'Reunião', color: 'bg-purple-500' };
      default: return { label: 'Evento', color: 'bg-gray-500' };
    }
  };

  const productivity = stats.totalTasks > 0 
    ? Math.round(((stats.totalTasks - stats.pendingTasks) / stats.totalTasks) * 100) 
    : 0;

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-muted/30 via-background to-primary/5">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative px-6 py-10 md:py-16">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                {getGreeting()},{' '}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {profile?.full_name?.split(' ')[0]}
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-lg">
                Aqui está o resumo da sua agência para hoje
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-8"
            >
              <StatsCard
                title="Clientes"
                value={stats.totalClients}
                icon={Building2}
                onClick={() => navigate('/clients')}
              />
              <StatsCard
                title="Tarefas Pendentes"
                value={stats.pendingTasks}
                subtitle={`de ${stats.totalTasks} total`}
                icon={CheckSquare}
                variant="warning"
                onClick={() => navigate('/tasks')}
              />
              <StatsCard
                title="Eventos Hoje"
                value={stats.todayEvents}
                icon={Calendar}
                variant="info"
                onClick={() => navigate('/calendar')}
              />
              <StatsCard
                title="Produtividade"
                value={`${productivity}%`}
                subtitle="tarefas concluídas"
                icon={TrendingUp}
                variant="success"
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Tasks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between p-5 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-amber-500/10">
                      <CheckSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Tarefas Pendentes</h2>
                      <p className="text-xs text-muted-foreground">{recentTasks.length} tarefas</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/tasks')}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ver todas
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="divide-y divide-border/40">
                  {recentTasks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Nenhuma tarefa pendente</p>
                    </div>
                  ) : (
                    recentTasks.map((task, index) => {
                      const priority = getPriorityConfig(task.priority);
                      return (
                        <motion.div 
                          key={task.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                          className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => navigate('/tasks')}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.due_date), "dd MMM", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                          <span className={cn(
                            "text-xs px-2.5 py-1 rounded-full font-medium",
                            priority.className
                          )}>
                            {priority.label}
                          </span>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Upcoming Events */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between p-5 border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-blue-500/10">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Próximos Eventos</h2>
                      <p className="text-xs text-muted-foreground">{upcomingEvents.length} eventos</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/calendar')}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ver calendário
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="divide-y divide-border/40">
                  {upcomingEvents.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Calendar className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Nenhum evento próximo</p>
                    </div>
                  ) : (
                    upcomingEvents.map((event, index) => {
                      const eventType = formatEventType(event.event_type);
                      return (
                        <motion.div 
                          key={event.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                          className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => navigate('/calendar')}
                        >
                          <div className={cn("w-1 h-10 rounded-full flex-shrink-0", eventType.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.start_date), "dd MMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                            {eventType.label}
                          </span>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
