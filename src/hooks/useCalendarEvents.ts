import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, isSameDay } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  all_day: boolean | null;
  location: string | null;
  client_id: string | null;
  assigned_to: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCalendarEvents(currentDate: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const { data, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_date', start.toISOString())
      .lte('start_date', end.toISOString())
      .order('start_date');

    if (fetchError) {
      setError(fetchError.message);
      setIsLoading(false);
      return;
    }

    if (data) {
      setEvents(data as CalendarEvent[]);
    }
    setIsLoading(false);
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getEventsForDay = useCallback((date: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_date), date));
  }, [events]);

  const getTodayEvents = useCallback(() => {
    return getEventsForDay(new Date());
  }, [getEventsForDay]);

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents,
    getEventsForDay,
    getTodayEvents,
  };
}
