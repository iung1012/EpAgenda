import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Calendar, 
  FileText, 
  UserPlus, 
  Edit3, 
  Video,
  ClipboardList,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'task_completed':
        return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'task_created':
        return { icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'event_created':
        return { icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case 'visit_scheduled':
        return { icon: Video, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'demand_created':
        return { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-500/10' };
      case 'client_added':
        return { icon: UserPlus, color: 'text-cyan-500', bg: 'bg-cyan-500/10' };
      default:
        return { icon: Edit3, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Atividade Recente</h2>
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-3 w-48 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Atividade Recente</h2>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Activity className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Sem atividade</p>
            <p className="text-xs text-muted-foreground text-center">
              Nenhuma atividade recente para exibir
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[1.15rem] top-4 bottom-4 w-px bg-border/50" />
            
            <div className="divide-y divide-border/50">
              {activities.map((activity, index) => {
                const { icon: Icon, color, bg } = getActivityIcon(activity.type);
                return (
                  <div 
                    key={activity.id} 
                    className="relative flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "relative z-10 h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                      bg
                    )}>
                      <Icon className={cn("h-4 w-4", color)} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-sm font-medium">{activity.title}</p>
                        {activity.user_name && (
                          <span className="text-xs text-muted-foreground">
                            por {activity.user_name.split(' ')[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
