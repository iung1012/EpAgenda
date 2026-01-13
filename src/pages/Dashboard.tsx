import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Calendar, CheckSquare, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatsCard } from '@/components/layout/StatsCard';

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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'alta': return { label: 'Alta', className: 'text-destructive bg-destructive/10' };
      case 'media': return { label: 'Média', className: 'text-orange-600 bg-orange-500/10' };
      case 'baixa': return { label: 'Baixa', className: 'text-muted-foreground bg-muted' };
      default: return { label: priority, className: 'text-muted-foreground bg-muted' };
    }
  };

  const formatEventType = (type: string) => {
    switch (type) {
      case 'demanda': return 'Demanda';
      case 'visita': return 'Visita';
      case 'reuniao': return 'Reunião';
      default: return 'Evento';
    }
  };

  const productivity = stats.totalTasks > 0 
    ? Math.round(((stats.totalTasks - stats.pendingTasks) / stats.totalTasks) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {getGreeting()}, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo da sua agência
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Clientes"
          value={stats.totalClients}
          icon={Building2}
        />
        <StatsCard
          title="Tarefas Pendentes"
          value={stats.pendingTasks}
          subtitle={`de ${stats.totalTasks} total`}
          icon={CheckSquare}
          variant="warning"
        />
        <StatsCard
          title="Eventos Hoje"
          value={stats.todayEvents}
          icon={Calendar}
          variant="info"
        />
        <StatsCard
          title="Produtividade"
          value={`${productivity}%`}
          subtitle="tarefas concluídas"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Tarefas Recentes
          </h2>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Nenhuma tarefa pendente
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {recentTasks.map((task) => {
                  const priority = getPriorityLabel(task.priority);
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.due_date), "dd MMM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priority.className}`}>
                        {priority.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Próximos Eventos
          </h2>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Nenhum evento próximo
              </p>
            ) : (
              <div className="divide-y divide-border/50">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.start_date), "dd MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {formatEventType(event.event_type)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
