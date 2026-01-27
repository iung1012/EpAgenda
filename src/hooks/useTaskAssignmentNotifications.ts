import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useProfiles } from './useProfiles';

interface TaskPayload {
  id: string;
  title: string;
  assigned_to: string | null;
  status: string;
  priority: string;
}

export function useTaskAssignmentNotifications() {
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const previousAssignmentsRef = useRef<Map<string, string | null>>(new Map());
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Fetch initial task assignments to track changes
    const initializeAssignments = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, assigned_to');
      
      if (data) {
        const assignmentMap = new Map<string, string | null>();
        data.forEach(task => {
          assignmentMap.set(task.id, task.assigned_to);
        });
        previousAssignmentsRef.current = assignmentMap;
        isInitializedRef.current = true;
      }
    };

    initializeAssignments();

    const channel = supabase
      .channel('task-assignments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          if (!isInitializedRef.current) return;

          const newTask = payload.new as TaskPayload;
          const oldTask = payload.old as TaskPayload;
          
          // Check if assigned_to changed and if the new assignee is the current user
          if (
            newTask.assigned_to !== oldTask.assigned_to &&
            newTask.assigned_to === user.id
          ) {
            // Get the name of who assigned the task
            const assignerName = profiles?.find(p => p.user_id === oldTask.assigned_to)?.full_name;
            
            // Show toast notification
            toast.info('📋 Nova tarefa atribuída a você!', {
              description: newTask.title,
              duration: 5000,
              action: {
                label: 'Ver',
                onClick: () => {
                  window.location.href = '/tasks';
                },
              },
            });

            // Play notification sound (optional browser API)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nova tarefa atribuída!', {
                body: newTask.title,
                icon: '/favicon.png',
              });
            }
          }

          // Update the reference
          previousAssignmentsRef.current.set(newTask.id, newTask.assigned_to);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          const newTask = payload.new as TaskPayload;
          
          // If a new task is created and assigned to current user
          if (newTask.assigned_to === user.id) {
            toast.info('📋 Nova tarefa criada para você!', {
              description: newTask.title,
              duration: 5000,
              action: {
                label: 'Ver',
                onClick: () => {
                  window.location.href = '/tasks';
                },
              },
            });

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nova tarefa criada!', {
                body: newTask.title,
                icon: '/favicon.png',
              });
            }
          }

          // Track the new task
          previousAssignmentsRef.current.set(newTask.id, newTask.assigned_to);
        }
      )
      .subscribe();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profiles]);
}
