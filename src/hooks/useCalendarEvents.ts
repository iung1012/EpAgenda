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
  // For visit events
  isVisit?: boolean;
  visitId?: string;
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

    // Fetch calendar events and visits in parallel
    const [eventsResult, visitsResult] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('*')
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())
        .order('start_date'),
      supabase
        .from('filmmaker_visits')
        .select('*')
        .gte('visit_date', start.toISOString())
        .lte('visit_date', end.toISOString())
        .order('visit_date')
    ]);

    if (eventsResult.error) {
      console.error('Error fetching calendar events:', eventsResult.error);
      setError(eventsResult.error.message);
      setIsLoading(false);
      return;
    }

    if (visitsResult.error) {
      console.error('Error fetching visits:', visitsResult.error);
      // Don't fail completely, just log and continue with calendar events only
    }

    // Convert visits to calendar event format
    const calendarEvents = (eventsResult.data || []) as CalendarEvent[];
    
    const visitEvents: CalendarEvent[] = (visitsResult.data || []).map(visit => ({
      id: `visit-${visit.id}`,
      title: `📹 ${visit.title}`,
      description: visit.description,
      event_type: 'visita',
      start_date: visit.visit_date,
      end_date: null,
      all_day: false,
      location: visit.location,
      client_id: visit.client_id,
      assigned_to: visit.filmmaker_id,
      color: '#22c55e', // Green for visits
      created_by: visit.filmmaker_id,
      created_at: visit.created_at,
      updated_at: visit.updated_at,
      isVisit: true,
      visitId: visit.id,
    }));

    console.log('Calendar events:', calendarEvents.length, 'Visit events:', visitEvents.length);
    setEvents([...calendarEvents, ...visitEvents]);
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
