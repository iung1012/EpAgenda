import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
  read_by: string[];
  target_user_id: string | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    setIsLoading(true);
    if (!user) { setIsLoading(false); return; }
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const parsed: Notification[] = data.map((n: any) => ({
        ...n,
        read_by: Array.isArray(n.read_by) ? (n.read_by as string[]) : [],
        target_user_id: n.target_user_id ?? null,
      }));
      setNotifications(parsed);
      if (user) {
        setUnreadCount(parsed.filter((n) => !n.read_by.includes(user.id)).length);
      }
    }
    setIsLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    const notification = notifications.find((n) => n.id === notificationId);
    if (!notification || notification.read_by.includes(user.id)) return;

    const updatedReadBy = [...notification.read_by, user.id];
    const { error } = await supabase
      .from('notifications')
      .update({ read_by: updatedReadBy })
      .eq('id', notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_by: updatedReadBy } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const unread = notifications.filter((n) => !n.read_by.includes(user.id));
    for (const notification of unread) {
      await supabase
        .from('notifications')
        .update({ read_by: [...notification.read_by, user.id] })
        .eq('id', notification.id);
    }
    
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read_by: n.read_by.includes(user.id) ? n.read_by : [...n.read_by, user.id],
      }))
    );
    setUnreadCount(0);
  };

  const createNotification = async (title: string, message: string) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase.from('notifications').insert({
      title,
      message,
      created_by: user.id,
    });

    if (!error) {
      fetchNotifications();
    }
    return { error };
  };

  useEffect(() => {
    fetchNotifications();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          fetchNotifications();
          const newNotif = payload.new as any;
          // Trigger Chrome push notification only if targeted to this user (or global)
          if (
            user &&
            newNotif.created_by !== user.id &&
            (newNotif.target_user_id === null || newNotif.target_user_id === user.id) &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification(newNotif.title || 'Nova notificação', {
              body: (newNotif.message || '').replace(/\s*\[task:[a-f0-9-]+\]/, ''),
              icon: '/favicon.png',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    createNotification,
    refetch: fetchNotifications,
  };
}
