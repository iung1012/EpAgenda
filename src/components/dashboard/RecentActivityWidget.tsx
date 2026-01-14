import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Calendar, 
  FileText, 
  UserPlus, 
  Edit3, 
  Video,
  ClipboardList,
  Activity,
  Clock,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_completed' | 'event_created' | 'visit_scheduled' | 'demand_created' | 'client_added';
  title: string;
  description: string;
  timestamp: string;
  user_name?: string;
}

interface ProfileInfo {
  user_id: string;
  full_name: string;
}

export function RecentActivityWidget() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Fetch profiles for user names
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name');

        const profileMap = new Map<string, string>();
        profiles?.forEach((p: ProfileInfo) => {
          profileMap.set(p.user_id, p.full_name);
        });

        // Fetch recent data from multiple tables
        const [tasksRes, eventsRes, visitsRes, demandsRes, clientsRes] = await Promise.all([
          supabase.from('tasks')
            .select('id, title, status, created_by, created_at, updated_at')
            .order('updated_at', { ascending: false })
            .limit(10),
          supabase.from('calendar_events')
            .select('id, title, created_by, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('filmmaker_visits')
            .select('id, title, filmmaker_id, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('filmmaker_demands')
            .select('id, title, filmmaker_id, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('clients')
            .select('id, name, created_by, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const allActivities: ActivityItem[] = [];

        // Process tasks
        tasksRes.data?.forEach(task => {
          const isCompleted = task.status === 'feito';
          allActivities.push({
            id: `task-${task.id}`,
            type: isCompleted ? 'task_completed' : 'task_created',
            title: isCompleted ? 'Tarefa concluída' : 'Nova tarefa criada',
            description: task.title,
            timestamp: task.updated_at,
            user_name: task.created_by ? profileMap.get(task.created_by) : undefined,
          });
        });

        // Process events
        eventsRes.data?.forEach(event => {
          allActivities.push({
            id: `event-${event.id}`,
            type: 'event_created',
            title: 'Evento agendado',
            description: event.title,
            timestamp: event.created_at,
            user_name: event.created_by ? profileMap.get(event.created_by) : undefined,
          });
        });

        // Process visits
        visitsRes.data?.forEach(visit => {
          allActivities.push({
            id: `visit-${visit.id}`,
            type: 'visit_scheduled',
            title: 'Visita agendada',
            description: visit.title,
            timestamp: visit.created_at,
            user_name: visit.filmmaker_id ? profileMap.get(visit.filmmaker_id) : undefined,
          });
        });

        // Process demands
        demandsRes.data?.forEach(demand => {
          allActivities.push({
            id: `demand-${demand.id}`,
            type: 'demand_created',
            title: 'Nova demanda',
            description: demand.title,
            timestamp: demand.created_at,
            user_name: demand.filmmaker_id ? profileMap.get(demand.filmmaker_id) : undefined,
          });
        });

        // Process clients
        clientsRes.data?.forEach(client => {
          allActivities.push({
            id: `client-${client.id}`,
            type: 'client_added',
            title: 'Novo cliente adicionado',
            description: client.name,
            timestamp: client.created_at,
            user_name: client.created_by ? profileMap.get(client.created_by) : undefined,
          });
        });

        // Sort by timestamp and take the most recent 8
        allActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setActivities(allActivities.slice(0, 8));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const getActivityConfig = (type: ActivityItem['type']) => {
    switch (type) {
      case 'task_completed':
        return { 
          icon: CheckCircle2, 
          color: 'text-emerald-600 dark:text-emerald-400', 
          bg: 'bg-emerald-100 dark:bg-emerald-500/20',
          badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
          label: 'Concluído'
        };
      case 'task_created':
        return { 
          icon: ClipboardList, 
          color: 'text-blue-600 dark:text-blue-400', 
          bg: 'bg-blue-100 dark:bg-blue-500/20',
          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
          label: 'Tarefa'
        };
      case 'event_created':
        return { 
          icon: Calendar, 
          color: 'text-violet-600 dark:text-violet-400', 
          bg: 'bg-violet-100 dark:bg-violet-500/20',
          badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
          label: 'Evento'
        };
      case 'visit_scheduled':
        return { 
          icon: Video, 
          color: 'text-amber-600 dark:text-amber-400', 
          bg: 'bg-amber-100 dark:bg-amber-500/20',
          badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
          label: 'Visita'
        };
      case 'demand_created':
        return { 
          icon: FileText, 
          color: 'text-rose-600 dark:text-rose-400', 
          bg: 'bg-rose-100 dark:bg-rose-500/20',
          badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
          label: 'Demanda'
        };
      case 'client_added':
        return { 
          icon: UserPlus, 
          color: 'text-cyan-600 dark:text-cyan-400', 
          bg: 'bg-cyan-100 dark:bg-cyan-500/20',
          badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
          label: 'Cliente'
        };
      default:
        return { 
          icon: Edit3, 
          color: 'text-muted-foreground', 
          bg: 'bg-muted',
          badge: 'bg-muted text-muted-foreground',
          label: 'Ação'
        };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">Atividade Recente</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 rounded-full bg-muted" />
                    <div className="h-5 w-14 rounded-full bg-muted" />
                  </div>
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Atividade Recente</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Últimas ações da equipe</p>
            </div>
          </div>
          {activities.length > 0 && (
            <Badge variant="secondary" className="font-normal">
              {activities.length} atividades
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Activity className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Sem atividade</p>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              Nenhuma atividade recente para exibir no momento
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border/40">
              {activities.map((activity, index) => {
                const config = getActivityConfig(activity.type);
                const Icon = config.icon;
                
                return (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "group flex items-start gap-4 p-4 transition-all duration-200",
                      "hover:bg-muted/50 cursor-default"
                    )}
                    style={{ 
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeIn 0.3s ease-out forwards'
                    }}
                  >
                    {/* Icon with gradient background */}
                    <div className={cn(
                      "relative h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      "transition-transform duration-200 group-hover:scale-105",
                      config.bg
                    )}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground leading-none">
                          {activity.title}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-5 font-medium border-0",
                            config.badge
                          )}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {activity.description}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                        {activity.user_name && (
                          <>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="font-medium text-muted-foreground">
                              {activity.user_name.split(' ')[0]}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
