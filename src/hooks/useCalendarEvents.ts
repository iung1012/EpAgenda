import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, isSameDay, getDate, getMonth } from 'date-fns';

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
  client_name?: string | null;
  assigned_to: string | null;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  isVisit?: boolean;
  visitId?: string;
}

export function useCalendarEvents(currentDate: Date) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Snapshot ref allows updateEventLocally to return a rollback closure
  const eventsRef = useRef<CalendarEvent[]>([]);
  eventsRef.current = events;

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const [eventsResult, visitsResult, profilesResult] = await Promise.all([
      supabase
        .from('calendar_events')
        .select('*, clients(name)')
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())
        .order('start_date'),
      supabase
        .from('filmmaker_visits')
        .select('*, clients(name)')
        .gte('visit_date', start.toISOString())
        .lte('visit_date', end.toISOString())
        .order('visit_date'),
      supabase
        .from('profiles')
        .select('user_id, full_name, birthday')
        .not('birthday', 'is', null),
    ]);

    if (eventsResult.error) {
      console.error('Error fetching calendar events:', eventsResult.error);
      setError(eventsResult.error.message);
      setIsLoading(false);
      return;
    }

    if (visitsResult.error) {
      console.error('Error fetching visits:', visitsResult.error);
    }

    const calendarEvents: CalendarEvent[] = (eventsResult.data || []).map((event: Record<string, unknown>) => ({
      ...(event as CalendarEvent),
      client_name: (event.clients as { name: string } | null)?.name ?? null,
    }));

    const visitEvents: CalendarEvent[] = (visitsResult.data || []).map((visit: Record<string, unknown>) => ({
      id: `visit-${visit.id as string}`,
      title: visit.title as string,   // no emoji prefix — display layer handles icons
      description: visit.description as string | null,
      event_type: 'visita',
      start_date: visit.visit_date as string,
      end_date: null,
      all_day: false,
      location: visit.location as string | null,
      client_id: visit.client_id as string | null,
      client_name: (visit.clients as { name: string } | null)?.name ?? null,
      assigned_to: visit.filmmaker_id as string | null,
      color: '#22c55e',
      created_by: visit.filmmaker_id as string | null,
      created_at: visit.created_at as string,
      updated_at: visit.updated_at as string,
      isVisit: true,
      visitId: visit.id as string,
    }));

    const birthdayEvents: CalendarEvent[] = [];
    if (profilesResult.data) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      for (const profile of profilesResult.data) {
        if (!profile.birthday) continue;
        const bday = new Date(profile.birthday + 'T00:00:00');
        if (getMonth(bday) === month) {
          const birthdayThisYear = new Date(year, month, getDate(bday), 9, 0, 0);
          birthdayEvents.push({
            id: `birthday-${profile.user_id}`,
            title: `Aniversário: ${profile.full_name}`,  // no emoji in data
            description: null,
            event_type: 'aniversario',
            start_date: birthdayThisYear.toISOString(),
            end_date: null,
            all_day: true,
            location: null,
            client_id: null,
            client_name: null,
            assigned_to: null,
            color: '#f59e0b',
            created_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }

    setEvents([...calendarEvents, ...visitEvents, ...birthdayEvents]);
    setIsLoading(false);
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getEventsForDay = useCallback(
    (date: Date) => events.filter((event) => isSameDay(new Date(event.start_date), date)),
    [events]
  );

  const getTodayEvents = useCallback(() => getEventsForDay(new Date()), [getEventsForDay]);

  // Returns a rollback function so callers can revert if the DB update fails
  const updateEventLocally = useCallback(
    (eventId: string, newStartDate: Date, newEndDate?: Date | null): (() => void) => {
      const snapshot = [...eventsRef.current];
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId
            ? {
                ...event,
                start_date: newStartDate.toISOString(),
                end_date: newEndDate ? newEndDate.toISOString() : event.end_date,
              }
            : event
        )
      );
      return () => setEvents(snapshot);
    },
    []
  );

  return {
    events,
    isLoading,
    error,
    refetch: fetchEvents,
    getEventsForDay,
    getTodayEvents,
    updateEventLocally,
  };
}
