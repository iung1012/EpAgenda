import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/layout/StatsCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { CalendarDaySkeleton, StatsSkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';
import { EventFormDialog, EventFormValues } from '@/components/forms/EventFormDialog';
import { VisitFormDialog, VisitFormValues } from '@/components/forms/VisitFormDialog';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { useProfiles } from '@/hooks/useProfiles';
import { DayEventsDialog } from '@/components/calendar/DayEventsDialog';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthView } from '@/components/calendar/MonthView';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';

interface Client {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
}

interface VisitData {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  visit_date: string;
  client_id: string | null;
  status: string;
  notes: string | null;
  filmmaker_id: string;
}

type ViewType = 'month' | 'week' | 'day';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const { events, isLoading, error, refetch, getEventsForDay, getTodayEvents } = useCalendarEvents(currentDate);
  const { profiles } = useProfiles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  // Day events dialog
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Visit form dialog
  const [isVisitDialogOpen, setIsVisitDialogOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<VisitData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isVisitSubmitting, setIsVisitSubmitting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch clients and equipment for visit form
  useEffect(() => {
    const fetchClientsAndEquipment = async () => {
      const [clientsResult, equipmentResult] = await Promise.all([
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('equipment').select('id, name').order('name'),
      ]);
      
      if (clientsResult.data) setClients(clientsResult.data);
      if (equipmentResult.data) setEquipment(equipmentResult.data);
    };
    
    fetchClientsAndEquipment();
  }, []);

  const getEventColor = (type: string) => {
    switch (type) {
      case 'demanda': return '#3b82f6';
      case 'visita': return '#22c55e';
      case 'reuniao': return '#a855f7';
      default: return '#6b7280';
    }
  };

  const handleSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);

    const startDateTime = new Date(`${data.start_date}T${data.start_time || '00:00'}`);
    // If no end time, default to 1 hour after start
    const endDateTime = data.end_time
      ? new Date(`${data.start_date}T${data.end_time}`)
      : new Date(startDateTime.getTime() + 60 * 60 * 1000); // +1 hour

    if (editingEvent) {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: data.title,
          description: data.description || null,
          event_type: data.event_type,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          location: data.location || null,
          assigned_to: data.assigned_to || null,
          color: getEventColor(data.event_type),
        })
        .eq('id', editingEvent.id);

      setIsSubmitting(false);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao atualizar evento', description: error.message });
      } else {
        toast({ title: 'Evento atualizado com sucesso!' });
        setIsDialogOpen(false);
        setEditingEvent(null);
        setDayDialogOpen(false);
        refetch();
      }
    } else {
      const { error } = await supabase.from('calendar_events').insert({
        title: data.title,
        description: data.description || null,
        event_type: data.event_type,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        all_day: false,
        location: data.location || null,
        assigned_to: data.assigned_to || null,
        created_by: user?.id,
        color: getEventColor(data.event_type),
      });

      setIsSubmitting(false);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao criar evento', description: error.message });
      } else {
        toast({ title: 'Evento criado com sucesso!' });
        setIsDialogOpen(false);
        setSelectedDate('');
        setSelectedTime('');
        setDayDialogOpen(false);
        refetch();
      }
    }
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;

    setIsDeleting(true);

    // Check if it's a visit event (id starts with 'visit-')
    if (eventToDelete.isVisit && eventToDelete.visitId) {
      const { error } = await supabase
        .from('filmmaker_visits')
        .delete()
        .eq('id', eventToDelete.visitId);

      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEventToDelete(null);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao excluir visita', description: error.message });
      } else {
        toast({ title: 'Visita excluída com sucesso!' });
        setDayDialogOpen(false);
        refetch();
      }
    } else {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventToDelete.id);

      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setEventToDelete(null);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao excluir evento', description: error.message });
      } else {
        toast({ title: 'Evento excluído com sucesso!' });
        setDayDialogOpen(false);
        refetch();
      }
    }
  };

  const handleDateClick = (day: Date) => {
    const dayEvents = getEventsForDay(day);
    setSelectedDay(day);
    setSelectedDayEvents(dayEvents);
    setDayDialogOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    handleEditEvent(event);
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    setSelectedDate(format(date, 'yyyy-MM-dd'));
    setSelectedTime(time);
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEditEvent = async (event: CalendarEvent) => {
    // Check if it's a visit event
    if (event.isVisit && event.visitId) {
      // Fetch the full visit data including equipment
      const { data: visitData, error: visitError } = await supabase
        .from('filmmaker_visits')
        .select('*')
        .eq('id', event.visitId)
        .single();

      if (visitError || !visitData) {
        toast({ variant: 'destructive', title: 'Erro ao carregar visita', description: visitError?.message });
        return;
      }

      // Fetch equipment for this visit
      const { data: visitEquipment } = await supabase
        .from('visit_equipment')
        .select('equipment_id')
        .eq('visit_id', event.visitId);

      setEditingVisit({
        ...visitData,
        equipment_ids: visitEquipment?.map(ve => ve.equipment_id) || [],
      } as VisitData & { equipment_ids: string[] });
      setIsVisitDialogOpen(true);
    } else {
      // Regular calendar event
      const startDate = new Date(event.start_date);
      setEditingEvent(event);
      setSelectedDate(format(startDate, 'yyyy-MM-dd'));
      setSelectedTime(format(startDate, 'HH:mm'));
      setIsDialogOpen(true);
    }
  };

  const handleVisitSubmit = async (data: VisitFormValues) => {
    if (!editingVisit || !user) return;

    setIsVisitSubmitting(true);

    // Keep the datetime as local time string without timezone conversion
    const visitDateTime = data.visit_date; // e.g., "2026-01-14T09:00"

    const { error } = await supabase
      .from('filmmaker_visits')
      .update({
        title: data.title,
        description: data.description || null,
        location: data.location || null,
        visit_date: visitDateTime,
        client_id: data.client_id || null,
        status: data.status,
        notes: data.notes || null,
      })
      .eq('id', editingVisit.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar visita', description: error.message });
      setIsVisitSubmitting(false);
      return;
    }

    // Update equipment - delete existing and insert new
    await supabase.from('visit_equipment').delete().eq('visit_id', editingVisit.id);

    if (data.equipment_ids.length > 0) {
      const equipmentInserts = data.equipment_ids.map((equipmentId) => ({
        visit_id: editingVisit.id,
        equipment_id: equipmentId,
      }));
      await supabase.from('visit_equipment').insert(equipmentInserts);
    }

    setIsVisitSubmitting(false);
    setIsVisitDialogOpen(false);
    setEditingVisit(null);
    setDayDialogOpen(false);
    toast({ title: 'Visita atualizada com sucesso!' });
    refetch();
  };

  const getVisitDefaultValues = (): Partial<VisitFormValues> | undefined => {
    if (!editingVisit) return undefined;
    
    const visitDate = new Date(editingVisit.visit_date);
    return {
      title: editingVisit.title.replace('📹 ', ''),
      description: editingVisit.description || '',
      location: editingVisit.location || '',
      visit_date: format(visitDate, "yyyy-MM-dd'T'HH:mm"),
      client_id: editingVisit.client_id || '',
      status: editingVisit.status as 'agendada' | 'realizada' | 'cancelada',
      notes: editingVisit.notes || '',
      equipment_ids: (editingVisit as VisitData & { equipment_ids?: string[] }).equipment_ids || [],
    };
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleAddNewFromDay = () => {
    if (selectedDay) {
      setSelectedDate(format(selectedDay, 'yyyy-MM-dd'));
      setSelectedTime('');
      setEditingEvent(null);
      setIsDialogOpen(true);
    }
  };

  const handleEventMove = async (eventId: string, newDate: Date) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Check if it's a visit event
    if (event.isVisit && event.visitId) {
      const { error } = await supabase
        .from('filmmaker_visits')
        .update({
          visit_date: newDate.toISOString(),
        })
        .eq('id', event.visitId);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao mover visita', description: error.message });
      } else {
        toast({ title: 'Visita movida com sucesso!' });
        refetch();
      }
    } else {
      // Regular calendar event
      // Calculate the duration if end_date exists
      let newEndDate: string | null = null;
      if (event.end_date) {
        const originalStart = new Date(event.start_date);
        const originalEnd = new Date(event.end_date);
        const duration = originalEnd.getTime() - originalStart.getTime();
        newEndDate = new Date(newDate.getTime() + duration).toISOString();
      }

      const { error } = await supabase
        .from('calendar_events')
        .update({
          start_date: newDate.toISOString(),
          end_date: newEndDate,
        })
        .eq('id', eventId);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao mover evento', description: error.message });
      } else {
        toast({ title: 'Evento movido com sucesso!' });
        refetch();
      }
    }
  };

  const getDefaultValues = (): Partial<EventFormValues> | undefined => {
    if (editingEvent) {
      const startDate = new Date(editingEvent.start_date);
      return {
        title: editingEvent.title,
        description: editingEvent.description || '',
        event_type: editingEvent.event_type as 'demanda' | 'visita' | 'reuniao' | 'outro',
        start_date: format(startDate, 'yyyy-MM-dd'),
        start_time: format(startDate, 'HH:mm'),
        end_time: editingEvent.end_date ? format(new Date(editingEvent.end_date), 'HH:mm') : '',
        location: editingEvent.location || '',
        assigned_to: editingEvent.assigned_to || '',
      };
    }
    if (selectedDate) {
      return { 
        start_date: selectedDate,
        start_time: selectedTime || undefined,
      };
    }
    return undefined;
  };

  const navigatePrevious = () => {
    if (viewType === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (viewType === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewType === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (viewType === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const getHeaderTitle = () => {
    if (viewType === 'month') {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    } else if (viewType === 'week') {
      return format(currentDate, "'Semana de' d 'de' MMMM", { locale: ptBR });
    } else {
      return format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    }
  };

  const todayEvents = getTodayEvents();

  if (error) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader title="Calendário" description="Gerencie eventos, demandas e visitas" />
        <Card>
          <CardContent className="pt-6">
            <ErrorState onRetry={refetch} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader 
        title="Calendário" 
        description="Gerencie eventos, demandas e visitas"
        action={
          <Button onClick={() => {
            setEditingEvent(null);
            setSelectedDate('');
            setSelectedTime('');
            setIsDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        }
      />

      {/* Form Dialog */}
      <EventFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedDate('');
            setSelectedTime('');
            setEditingEvent(null);
          }
        }}
        onSubmit={handleSubmit}
        defaultValues={getDefaultValues()}
        profiles={profiles}
        isEditing={!!editingEvent}
        isLoading={isSubmitting}
      />

      {/* Day Events Dialog */}
      <DayEventsDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        date={selectedDay}
        events={selectedDayEvents}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onAddNew={handleAddNewFromDay}
      />

      {/* Visit Form Dialog */}
      <VisitFormDialog
        open={isVisitDialogOpen}
        onOpenChange={(open) => {
          setIsVisitDialogOpen(open);
          if (!open) {
            setEditingVisit(null);
          }
        }}
        onSubmit={handleVisitSubmit}
        defaultValues={getVisitDefaultValues()}
        clients={clients}
        equipment={equipment}
        isEditing={true}
        isLoading={isVisitSubmitting}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Evento"
        description={`Tem certeza que deseja excluir "${eventToDelete?.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
        isLoading={isDeleting}
      />

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatsSkeleton />
          <StatsSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatsCard
            title="Eventos este mês"
            value={events.length}
            icon={CalendarDays}
            variant="info"
          />
          <StatsCard
            title="Eventos hoje"
            value={todayEvents.length}
            icon={Clock}
            variant={todayEvents.length > 0 ? 'success' : 'default'}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        <span className="text-sm text-muted-foreground font-medium">Legenda:</span>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-sm text-muted-foreground">Visita</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#a855f7' }} />
          <span className="text-sm text-muted-foreground">Reunião</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
          <span className="text-sm text-muted-foreground">Demanda</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#6b7280' }} />
          <span className="text-sm text-muted-foreground">Outro</span>
        </div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl capitalize">
              {getHeaderTitle()}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
              <TabsList>
                <TabsTrigger value="month">Mês</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="day">Dia</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoje
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => (
                <CalendarDaySkeleton key={i} />
              ))}
            </div>
          ) : viewType === 'month' ? (
            <MonthView
              currentDate={currentDate}
              events={events}
              getEventsForDay={getEventsForDay}
              onDayClick={handleDateClick}
            />
          ) : viewType === 'week' ? (
            <div className="max-h-[600px] overflow-auto">
              <WeekView
                currentDate={currentDate}
                events={events}
                onEventClick={handleEventClick}
                onTimeSlotClick={handleTimeSlotClick}
                onEventMove={handleEventMove}
                onEventDelete={handleDeleteEvent}
              />
            </div>
          ) : (
            <DayView
              currentDate={currentDate}
              events={events}
              onEventClick={handleEventClick}
              onTimeSlotClick={handleTimeSlotClick}
              onEventMove={handleEventMove}
              onEventDelete={handleDeleteEvent}
            />
          )}
        </CardContent>
      </Card>

      {/* Today's Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eventos de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 animate-pulse">
                  <div className="h-10 w-1 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : todayEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum evento para hoje"
              description="Clique em um dia do calendário para adicionar um evento"
            />
          ) : (
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 group">
                  <div
                    className="h-10 w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{event.title}</h4>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_date), 'HH:mm')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditEvent(event)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteEvent(event)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}