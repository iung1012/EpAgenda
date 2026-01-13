import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Calendar, CheckSquare, TrendingUp, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatsCard } from '@/components/layout/StatsCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'alta': return { dot: 'bg-destructive', text: 'text-destructive' };
      case 'media': return { dot: 'bg-amber-500', text: 'text-amber-600' };
      case 'baixa': return { dot: 'bg-muted-foreground', text: 'text-muted-foreground' };
      default: return { dot: 'bg-muted-foreground', text: 'text-muted-foreground' };
    }
  };

  const getEventTypeStyles = (type: string) => {
    switch (type) {
      case 'demanda': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'visita': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'reuniao': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      default: return 'bg-muted text-muted-foreground';
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

  const currentDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-8 animate-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent p-8 border border-border/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-sm font-medium text-muted-foreground capitalize mb-2">
            {currentDate}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
            {getGreeting()}, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground max-w-lg">
            Aqui está o resumo da sua agência. Você tem{' '}
            <span className="font-medium text-foreground">{stats.pendingTasks} tarefas</span> pendentes e{' '}
            <span className="font-medium text-foreground">{stats.todayEvents} eventos</span> hoje.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total de Clientes"
          value={stats.totalClients}
          icon={Building2}
        />
        <StatsCard
          title="Tarefas Pendentes"
          value={stats.pendingTasks}
          subtitle={`de ${stats.totalTasks} no total`}
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

      {/* Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tarefas Pendentes</h2>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/tasks">
                Ver todas
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            {recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground text-center">
                  Nenhuma tarefa pendente no momento
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentTasks.map((task, index) => {
                  const priority = getPriorityStyles(task.priority);
                  return (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", priority.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Próximos Eventos</h2>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/calendar">
                Ver calendário
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Agenda livre</p>
                <p className="text-xs text-muted-foreground text-center">
                  Nenhum evento agendado
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {upcomingEvents.map((event, index) => (
                  <div 
                    key={event.id} 
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="h-10 w-10 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-semibold leading-none">
                        {format(new Date(event.start_date), "dd")}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        {format(new Date(event.start_date), "MMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(event.start_date), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <span className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium shrink-0",
                      getEventTypeStyles(event.event_type)
                    )}>
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
