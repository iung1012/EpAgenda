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
  created_by: string | null;
}

export function useTaskAssignmentNotifications() {
  const { user } = useAuth();
  const { profiles, getProfileName } = useProfiles();
  const previousTasksRef = useRef<Map<string, { assigned_to: string | null; status: string }>>(new Map());
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const initializeTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, assigned_to, status');
      
      if (data) {
        const taskMap = new Map<string, { assigned_to: string | null; status: string }>();
        data.forEach(task => {
          taskMap.set(task.id, { assigned_to: task.assigned_to, status: task.status });
        });
        previousTasksRef.current = taskMap;
        isInitializedRef.current = true;
      }
    };

    initializeTasks();

    const channel = supabase
      .channel('task-global-notifications')
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
          const previous = previousTasksRef.current.get(newTask.id);
          const oldStatus = previous?.status || oldTask.status;

          // Status changed - notify everyone
          if (newTask.status !== oldStatus) {
            const taskTitle = newTask.title;

            if (newTask.status === 'fazendo') {
              toast.info('🔄 Tarefa em progresso', {
                description: taskTitle,
                duration: 4000,
              });
            } else if (newTask.status === 'feito') {
              toast.success('✅ Tarefa concluída', {
                description: taskTitle,
                duration: 4000,
              });
            } else if (newTask.status === 'a_fazer' && oldStatus === 'feito') {
              toast.info('🔁 Tarefa reaberta', {
                description: taskTitle,
                duration: 4000,
              });
            }
          }

          // Assignment changed - notify assigned user specifically
          if (
            newTask.assigned_to !== oldTask.assigned_to &&
            newTask.assigned_to === user.id
          ) {
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

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nova tarefa atribuída!', {
                body: newTask.title,
                icon: '/favicon.png',
              });
            }
          }

          // Update reference
          previousTasksRef.current.set(newTask.id, { 
            assigned_to: newTask.assigned_to, 
            status: newTask.status 
          });
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

          // Notify everyone about new task
          toast.info('📌 Nova tarefa adicionada', {
            description: newTask.title,
            duration: 4000,
          });

          // Extra notification if assigned to current user
          if (newTask.assigned_to === user.id && newTask.created_by !== user.id) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nova tarefa criada para você!', {
                body: newTask.title,
                icon: '/favicon.png',
              });
            }
          }

          previousTasksRef.current.set(newTask.id, { 
            assigned_to: newTask.assigned_to, 
            status: newTask.status 
          });
        }
      )
      .subscribe();

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profiles]);
}
