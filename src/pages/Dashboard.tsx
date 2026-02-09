import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, Calendar, CheckSquare, TrendingUp, Clock, ArrowRight, 
  Sparkles, AlertTriangle, Zap, BarChart3
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import { motion } from 'framer-motion';

interface DashboardStats {
  totalClients: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  todayEvents: number;
  overdueTasks: number;
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
    inProgressTasks: 0,
    todayEvents: 0,
    overdueTasks: 0,
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [clientsRes, tasksRes, pendingTasksRes, inProgressRes, eventsRes, recentTasksRes, upcomingEventsRes, overdueRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'a_fazer'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'fazendo'),
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
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .neq('status', 'feito')
          .lt('due_date', today.toISOString()),
      ]);

      setStats({
        totalClients: clientsRes.count || 0,
        totalTasks: tasksRes.count || 0,
        pendingTasks: pendingTasksRes.count || 0,
        inProgressTasks: inProgressRes.count || 0,
        todayEvents: eventsRes.count || 0,
        overdueTasks: overdueRes.count || 0,
      });

      if (recentTasksRes.data) setRecentTasks(recentTasksRes.data);
      if (upcomingEventsRes.data) setUpcomingEvents(upcomingEventsRes.data);
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
      case 'alta': return { dot: 'bg-destructive', badge: 'bg-destructive/10 text-destructive' };
      case 'media': return { dot: 'bg-warning', badge: 'bg-warning/10 text-warning' };
      case 'baixa': return { dot: 'bg-muted-foreground/50', badge: 'bg-muted text-muted-foreground' };
      default: return { dot: 'bg-muted-foreground', badge: 'bg-muted text-muted-foreground' };
    }
  };

  const getEventTypeStyles = (type: string) => {
    switch (type) {
      case 'demanda': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'visita': return 'bg-info/10 text-info';
      case 'reuniao': return 'bg-success/10 text-success';
      case 'aniversario': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatEventType = (type: string) => {
    switch (type) {
      case 'demanda': return 'Demanda';
      case 'visita': return 'Visita';
      case 'reuniao': return 'Reunião';
      case 'aniversario': return '🎂';
      default: return 'Evento';
    }
  };

  const productivity = stats.totalTasks > 0 
    ? Math.round(((stats.totalTasks - stats.pendingTasks - stats.inProgressTasks) / stats.totalTasks) * 100) 
    : 0;

  const currentDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Greeting Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground capitalize">{currentDate}</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
            {getGreeting()}, <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">{profile?.full_name?.split(' ')[0]}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-xl gap-2 h-9">
            <Link to="/tasks">
              <CheckSquare className="h-4 w-4" />
              Tarefas
            </Link>
          </Button>
          <Button size="sm" asChild className="rounded-xl gap-2 h-9">
            <Link to="/calendar">
              <Calendar className="h-4 w-4" />
              Calendário
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { 
            label: 'Clientes', value: stats.totalClients, 
            icon: Building2, 
            iconBg: 'bg-secondary', iconColor: 'text-foreground' 
          },
          { 
            label: 'A Fazer', value: stats.pendingTasks, 
            icon: CheckSquare,
            iconBg: 'bg-warning/10', iconColor: 'text-warning',
            highlight: stats.pendingTasks > 0
          },
          { 
            label: 'Em Progresso', value: stats.inProgressTasks, 
            icon: Zap,
            iconBg: 'bg-info/10', iconColor: 'text-info' 
          },
          { 
            label: 'Eventos Hoje', value: stats.todayEvents, 
            icon: Calendar,
            iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' 
          },
          { 
            label: 'Produtividade', value: `${productivity}%`, 
            icon: BarChart3,
            iconBg: 'bg-success/10', iconColor: 'text-success',
            className: 'col-span-2 lg:col-span-1'
          },
        ].map((stat) => (
          <div 
            key={stat.label}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 transition-all duration-300 hover:shadow-md hover:border-border",
              stat.className
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", stat.iconBg)}>
                <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
              </div>
              <div>
                <p className={cn("text-2xl font-bold tabular-nums tracking-tight", stat.iconColor)}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Overdue Alert */}
      {stats.overdueTasks > 0 && (
        <motion.div variants={itemVariants}>
          <Link 
            to="/tasks" 
            className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive flex-1">
              {stats.overdueTasks} {stats.overdueTasks === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'} — clique para ver
            </p>
            <ArrowRight className="h-4 w-4 text-destructive/60" />
          </Link>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pending Tasks */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Tarefas Pendentes</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground h-7 px-2">
              <Link to="/tasks">
                Ver todas
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            {recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-success" />
                </div>
                <p className="text-sm font-semibold mb-0.5">Tudo em dia!</p>
                <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentTasks.map((task) => {
                  const priority = getPriorityStyles(task.priority);
                  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
                  return (
                    <Link
                      key={task.id}
                      to="/tasks"
                      className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group"
                    >
                      <div className={cn("h-2 w-2 rounded-full shrink-0", priority.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </p>
                        {task.due_date && (
                          <p className={cn(
                            "text-[11px] flex items-center gap-1 mt-0.5",
                            isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                          )}>
                            <Clock className="h-3 w-3" />
                            {isOverdue ? 'Atrasada' : format(new Date(task.due_date), "dd MMM", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase", priority.badge)}>
                        {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Próximos Eventos</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground h-7 px-2">
              <Link to="/calendar">
                Calendário
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <div className="h-12 w-12 rounded-2xl bg-info/10 flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-info" />
                </div>
                <p className="text-sm font-semibold mb-0.5">Agenda livre</p>
                <p className="text-xs text-muted-foreground">Nenhum evento agendado</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    to="/calendar"
                    className="flex items-center gap-3 p-3.5 hover:bg-muted/40 transition-colors group"
                  >
                    <div className="h-11 w-11 rounded-xl bg-muted/60 flex flex-col items-center justify-center shrink-0 border border-border/30">
                      <span className="text-sm font-bold leading-none tabular-nums">
                        {format(new Date(event.start_date), "dd")}
                      </span>
                      <span className="text-[9px] text-muted-foreground uppercase font-semibold mt-0.5">
                        {format(new Date(event.start_date), "MMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {event.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {format(new Date(event.start_date), "HH:mm")} · {isToday(new Date(event.start_date)) ? 'Hoje' : format(new Date(event.start_date), "EEEE", { locale: ptBR })}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0",
                      getEventTypeStyles(event.event_type)
                    )}>
                      {formatEventType(event.event_type)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <RecentActivityWidget />
        </motion.div>
      </div>
    </motion.div>
  );
}