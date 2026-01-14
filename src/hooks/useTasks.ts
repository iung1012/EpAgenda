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
  updated_at: string;
  // For demand tasks
  isDemand?: boolean;
  demandId?: string;
}

// Map demand status to task status
const mapDemandStatusToTaskStatus = (demandStatus: string): TaskStatus => {
  switch (demandStatus) {
    case 'concluido':
      return 'feito';
    case 'em_processo':
      return 'fazendo';
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
      
      // Map task status back to demand status
      let demandStatus: string;
      switch (newStatus) {
        case 'feito':
          demandStatus = 'concluido';
          break;
        case 'fazendo':
          demandStatus = 'em_processo';
          break;
        default:
          demandStatus = 'pendente';
      }
      
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

  return {
    tasks,
    isLoading,
    error,
    refetch: fetchTasks,
    getTasksByStatus,
    updateTaskStatus,
  };
}
