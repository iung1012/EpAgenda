import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TaskStatus = 'a_fazer' | 'fazendo' | 'feito';
export type TaskPriority = 'baixa' | 'media' | 'alta';

export interface Task {
  id: string;
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
  // For demand tasks
  isDemand?: boolean;
  demandId?: string;
}

// Map demand status to task status
// DB constraint allows: 'a_fazer', 'em_processo', 'terminado', 'alteracoes'
const mapDemandStatusToTaskStatus = (demandStatus: string): TaskStatus => {
  switch (demandStatus) {
    case 'terminado':
      return 'feito';
    case 'em_processo':
      return 'fazendo';
    case 'a_fazer':
    case 'alteracoes':
    default:
      return 'a_fazer';
  }
};

// Map task status back to demand status
// DB constraint allows: 'a_fazer', 'em_processo', 'terminado', 'alteracoes'
const mapTaskStatusToDemandStatus = (taskStatus: TaskStatus): string => {
  switch (taskStatus) {
    case 'feito':
      return 'terminado';
    case 'fazendo':
      return 'em_processo';
    case 'a_fazer':
    default:
      return 'a_fazer';
  }
};

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Fetch tasks and demands in parallel
    const [tasksResult, demandsResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('filmmaker_demands')
        .select('*')
        .order('created_at', { ascending: false })
    ]);

    if (tasksResult.error) {
      setError(tasksResult.error.message);
      setIsLoading(false);
      return;
    }

    // Convert demands to task format
    const regularTasks = (tasksResult.data || []) as Task[];
    
    const demandTasks: Task[] = (demandsResult.data || []).map(demand => ({
      id: `demand-${demand.id}`,
      title: `📋 ${demand.title}`,
      description: demand.description,
      status: mapDemandStatusToTaskStatus(demand.status),
      priority: 'media' as TaskPriority, // Default priority for demands
      due_date: demand.due_date,
      client_id: demand.client_id,
      assigned_to: demand.filmmaker_id,
      created_by: demand.filmmaker_id,
      created_at: demand.created_at,
      updated_at: demand.updated_at,
      delivery_link: demand.delivery_link,
      isDemand: true,
      demandId: demand.id,
    }));

    // Combine tasks and demands
    setTasks([...regularTasks, ...demandTasks]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getTasksByStatus = useCallback((status: TaskStatus) => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    // Check if it's a demand task
    if (taskId.startsWith('demand-')) {
      const demandId = taskId.replace('demand-', '');
      const demandStatus = mapTaskStatusToDemandStatus(newStatus);
      
      const { error } = await supabase
        .from('filmmaker_demands')
        .update({ status: demandStatus })
        .eq('id', demandId);

      if (!error) {
        fetchTasks();
      }
      return { error };
    } else {
      // Regular task
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (!error) {
        fetchTasks();
      }
      return { error };
    }
  }, [fetchTasks]);

  const updateTaskDeliveryLink = useCallback(async (taskId: string, deliveryLink: string) => {
    // Check if it's a demand task
    if (taskId.startsWith('demand-')) {
      const demandId = taskId.replace('demand-', '');
      
      const { error } = await supabase
        .from('filmmaker_demands')
        .update({ delivery_link: deliveryLink })
        .eq('id', demandId);

      if (!error) {
        fetchTasks();
      }
      return { error };
    } else {
      // Regular task
      const { error } = await supabase
        .from('tasks')
        .update({ delivery_link: deliveryLink })
        .eq('id', taskId);

      if (!error) {
        fetchTasks();
      }
      return { error };
    }
  }, [fetchTasks]);

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
