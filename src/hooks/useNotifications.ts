import { useState, useEffect, useCallback, useRef } from 'react';
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

function parseNotification(raw: Record<string, unknown>): Notification {
  return {
    id: raw.id as string,
    title: raw.title as string,
    message: raw.message as string,
    created_by: raw.created_by as string,
    created_at: raw.created_at as string,
    read_by: Array.isArray(raw.read_by) ? (raw.read_by as string[]) : [],
    target_user_id: (raw.target_user_id as string | null) ?? null,
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelInstanceId = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    if (!user) { setIsLoading(false); return; }
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const parsed = (data as Record<string, unknown>[]).map(parseNotification);
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n) => !n.read_by.includes(user.id)).length);
    }
    setIsLoading(false);
  }, [user]);

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
        prev.map((n) => n.id === notificationId ? { ...n, read_by: updatedReadBy } : n)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Parallel updates instead of sequential loop — N→1 roundtrip reduction
  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter((n) => !n.read_by.includes(user.id));
    if (unread.length === 0) return;

    // Optimistic update first for instant UI response
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read_by: n.read_by.includes(user.id) ? n.read_by : [...n.read_by, user.id],
      }))
    );
    setUnreadCount(0);

    // Fire all DB updates in parallel
    await Promise.all(
      unread.map((n) =>
        supabase
          .from('notifications')
          .update({ read_by: [...n.read_by, user.id] })
          .eq('id', n.id)
      )
    );
  };

  const createNotification = async (title: string, message: string) => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase.from('notifications').insert({
      title,
      message,
      created_by: user.id,
    });
    return { error };
  };

  useEffect(() => {
    fetchNotifications();

    if (!user?.id) {
      return;
    }

    const userId = user.id;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Unique per hook instance because NotificationBell and the dialog can mount together.
    const channel = supabase
      .channel(`notifications:user:${userId}:${channelInstanceId.current}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const newNotif = parseNotification(raw);

          // Ignore notifications not targeted at this user
          if (newNotif.target_user_id !== null && newNotif.target_user_id !== userId) return;

          setNotifications((prev) => [newNotif, ...prev]);
          if (!newNotif.read_by.includes(userId)) {
            setUnreadCount((prev) => prev + 1);
          }

          // Browser push notification for other users' inserts
          if (
            newNotif.created_by !== userId &&
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
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const updatedId = raw.id as string;
          const updatedReadBy: string[] = Array.isArray(raw.read_by) ? (raw.read_by as string[]) : [];

          setNotifications((prev) => {
            const updated = prev.map((n) =>
              n.id === updatedId ? { ...n, read_by: updatedReadBy } : n
            );
            setUnreadCount(updated.filter((n) => !n.read_by.includes(userId)).length);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
