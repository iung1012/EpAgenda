import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TaskStatus = 'a_fazer' | 'fazendo' | 'feito';
export type TaskPriority = 'baixa' | 'media' | 'alta';
export type TaskSource = 'task' | 'demand';

export interface Task {
  id: string;
  source: TaskSource;  // discriminator: which table this row came from
  sourceId: string;    // original DB id without any prefix
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  client_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  delivery_link: string | null;
  updated_at: string;
}

const mapDemandStatusToTaskStatus = (demandStatus: string): TaskStatus => {
  switch (demandStatus) {
    case 'terminado': return 'feito';
    case 'em_processo': return 'fazendo';
    case 'a_fazer':
    case 'alteracoes':
    default: return 'a_fazer';
  }
};

const mapTaskStatusToDemandStatus = (taskStatus: TaskStatus): string => {
  switch (taskStatus) {
    case 'feito': return 'terminado';
    case 'fazendo': return 'em_processo';
    case 'a_fazer':
    default: return 'a_fazer';
  }
};

// Deduplication window: prevent duplicate notifications within 10 seconds
const lastDeliveryNotification = new Map<string, number>();

async function notifyAdminsOnDelivery(taskTitle: string, deliveryLink: string, userId: string) {
  const key = `${taskTitle}:${deliveryLink}`;
  const now = Date.now();
  const last = lastDeliveryNotification.get(key) ?? 0;
  if (now - last < 10_000) return; // skip if notified in last 10s
  lastDeliveryNotification.set(key, now);

  try {
    await supabase.from('notifications').insert({
      title: 'Entrega Concluída',
      message: `A tarefa "${taskTitle}" foi concluída. Link: ${deliveryLink}`,
      created_by: userId,
    });
  } catch (error) {
    console.error('Error creating delivery notification:', error);
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Keep a stable ref for rollback without stale closure issues
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = tasks;

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [tasksResult, demandsResult] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('filmmaker_demands').select('*').order('created_at', { ascending: false }),
    ]);

    if (tasksResult.error) {
      setError(tasksResult.error.message);
      setIsLoading(false);
      return;
    }

    const regularTasks: Task[] = (tasksResult.data || []).map((t) => ({
      ...(t as Omit<Task, 'source' | 'sourceId'>),
      source: 'task' as TaskSource,
      sourceId: t.id,
    }));

    const demandTasks: Task[] = (demandsResult.data || []).map((demand) => ({
      id: `demand-${demand.id}`,
      source: 'demand' as TaskSource,
      sourceId: demand.id,
      title: demand.title,  // no emoji prefix in DB data
      description: demand.description,
      status: mapDemandStatusToTaskStatus(demand.status),
      priority: 'media' as TaskPriority,
      due_date: demand.due_date,
      client_id: demand.client_id,
      assigned_to: demand.filmmaker_id,
      created_by: demand.filmmaker_id,
      created_at: demand.created_at,
      updated_at: demand.updated_at,
      delivery_link: demand.delivery_link,
    }));

    setTasks([...regularTasks, ...demandTasks]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const previous = tasksRef.current;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    const task = previous.find((t) => t.id === taskId);
    if (!task) return { error: new Error('Task not found') };

    if (task.source === 'demand') {
      const { error } = await supabase
        .from('filmmaker_demands')
        .update({ status: mapTaskStatusToDemandStatus(newStatus) })
        .eq('id', task.sourceId);
      if (error) setTasks(previous);
      return { error };
    }

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.sourceId);
    if (error) setTasks(previous);
    return { error };
  }, []);

  const updateTaskDeliveryLink = useCallback(
    async (taskId: string, deliveryLink: string, taskTitle?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return { error: new Error('Task not found') };

      if (task.source === 'demand') {
        const { error } = await supabase
          .from('filmmaker_demands')
          .update({ delivery_link: deliveryLink })
          .eq('id', task.sourceId);
        if (!error) {
          if (userId && taskTitle) await notifyAdminsOnDelivery(taskTitle, deliveryLink, userId);
          fetchTasks();
        }
        return { error };
      }

      const { error } = await supabase
        .from('tasks')
        .update({ delivery_link: deliveryLink })
        .eq('id', task.sourceId);
      if (!error) {
        if (userId && taskTitle) await notifyAdminsOnDelivery(taskTitle, deliveryLink, userId);
        fetchTasks();
      }
      return { error };
    },
    [fetchTasks]
  );

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
    getTasksByStatus,
    updateTaskStatus,
    updateTaskDeliveryLink,
  };
}
