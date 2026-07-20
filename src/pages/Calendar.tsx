import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, CalendarDays, Pencil, Trash2, Video, Users, FileText, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/layout/EmptyState';
import { CalendarDaySkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';
import { EventFormDialog, EventFormValues } from '@/components/forms/EventFormDialog';
import { VisitFormDialog, VisitFormValues } from '@/components/forms/VisitFormDialog';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { useHolidays } from '@/hooks/useHolidays';
import { useProfiles } from '@/hooks/useProfiles';
import { sendWhatsappNotification } from '@/lib/whatsapp';
import { DayEventsDialog } from '@/components/calendar/DayEventsDialog';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthView } from '@/components/calendar/MonthView';
import { WeekView } from '@/components/calendar/WeekView';
import { DayView } from '@/components/calendar/DayView';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  assigned_to: string | null;
  delivery_deadline: string | null;
}

type ViewType = 'month' | 'week' | 'day';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<ViewType>('month');
  const { events, isLoading, error, refetch, getEventsForDay, getTodayEvents, updateEventLocally } = useCalendarEvents(currentDate);
  const { getHolidayForDate } = useHolidays(currentDate.getFullYear());
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
          client_id: data.client_id || null,
          color: getEventColor(data.event_type),
        })
        .eq('id', editingEvent.id);

      setIsSubmitting(false);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao atualizar evento', description: error.message });
      } else {
        toast({ title: 'Evento atualizado com sucesso!' });
        {
          const clientName = data.client_id ? clients.find(c => c.id === data.client_id)?.name ?? null : null;
          const assignedName = data.assigned_to ? profiles.find(p => p.user_id === data.assigned_to)?.full_name ?? null : null;
          sendWhatsappNotification('update', {
            title: data.title,
            visit_date: startDateTime.toISOString(),
            location: data.location,
            clientName,
            assignedName,
            kindLabel: 'evento',
          });
        }
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
        client_id: data.client_id || null,
        created_by: user?.id,
        color: getEventColor(data.event_type),
      });

      setIsSubmitting(false);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao criar evento', description: error.message });
      } else {
        toast({ title: 'Evento criado com sucesso!' });
        {
          const clientName = data.client_id ? clients.find(c => c.id === data.client_id)?.name ?? null : null;
          const assignedName = data.assigned_to ? profiles.find(p => p.user_id === data.assigned_to)?.full_name ?? null : null;
          sendWhatsappNotification('create', {
            title: data.title,
            visit_date: startDateTime.toISOString(),
            location: data.location,
            clientName,
            assignedName,
            kindLabel: 'evento',
          });
        }
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
      const visitInfo = {
        title: eventToDelete.title?.replace('📹 ', '') || 'Visita',
        visit_date: eventToDelete.start_date,
      };
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
        sendWhatsappNotification('cancel', visitInfo);
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
        sendWhatsappNotification('cancel', {
          title: eventToDelete.title || 'Evento',
          visit_date: eventToDelete.start_date,
          location: (eventToDelete as any).location ?? null,
          kindLabel: 'evento',
        });
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
    // Get the most up-to-date event from local state (for optimistic updates)
    const currentEvent = events.find(e => e.id === event.id) || event;
    
    // Check if it's a visit event
    if (currentEvent.isVisit && currentEvent.visitId) {
      // Fetch the full visit data including equipment
      const { data: visitData, error: visitError } = await supabase
        .from('filmmaker_visits')
        .select('*')
        .eq('id', currentEvent.visitId)
        .single();

      if (visitError || !visitData) {
        toast({ variant: 'destructive', title: 'Erro ao carregar visita', description: visitError?.message });
        return;
      }

      // Fetch equipment for this visit
      const { data: visitEquipment } = await supabase
        .from('visit_equipment')
        .select('equipment_id')
        .eq('visit_id', currentEvent.visitId);

      // Use the local event's start_date (may have been updated optimistically)
      setEditingVisit({
        ...visitData,
        visit_date: currentEvent.start_date, // Use local state which has optimistic update
        equipment_ids: visitEquipment?.map(ve => ve.equipment_id) || [],
      } as VisitData & { equipment_ids: string[] });
      setIsVisitDialogOpen(true);
    } else {
      // Regular calendar event - use the current event from local state
      const startDate = new Date(currentEvent.start_date);
      setEditingEvent(currentEvent);
      setSelectedDate(format(startDate, 'yyyy-MM-dd'));
      setSelectedTime(format(startDate, 'HH:mm'));
      setIsDialogOpen(true);
    }
  };

  const handleVisitSubmit = async (data: VisitFormValues) => {
    if (!user) return;

    setIsVisitSubmitting(true);

    // Converte o horário local para ISO com offset (consistente com as demais telas)
    const visitDateTime = new Date(data.visit_date).toISOString();

    if (!editingVisit) {
      // Create new visit
      const { data: created, error } = await supabase
        .from('filmmaker_visits')
        .insert({
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          visit_date: visitDateTime,
          client_id: data.client_id || null,
          status: data.status,
          notes: data.notes || null,
          filmmaker_id: user.id,
          assigned_to: data.assigned_to || null,
          delivery_deadline: data.delivery_deadline || null,
        })
        .select()
        .single();

      if (error || !created) {
        toast({ variant: 'destructive', title: 'Erro ao criar visita', description: error?.message });
        setIsVisitSubmitting(false);
        return;
      }

      if (data.equipment_ids.length > 0) {
        await supabase.from('visit_equipment').insert(
          data.equipment_ids.map((equipmentId) => ({ visit_id: created.id, equipment_id: equipmentId }))
        );
      }

      if (data.assigned_to) {
        await supabase.from('tasks').insert({
          title: `Entrega: ${data.title}`,
          description: `Tarefa gerada a partir da visita agendada para ${format(new Date(data.visit_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.${data.notes ? `\n\nNotas: ${data.notes}` : ''}`,
          status: 'a_fazer',
          priority: 'media',
          due_date: data.delivery_deadline,
          client_id: data.client_id || null,
          assigned_to: data.assigned_to,
          created_by: user.id,
          visit_id: created.id,
        });
      }

      const clientName = data.client_id ? clients.find(c => c.id === data.client_id)?.name ?? null : null;
      const assignedName = data.assigned_to ? profiles.find(p => p.user_id === data.assigned_to)?.full_name ?? null : null;
      sendWhatsappNotification('create', {
        title: data.title,
        visit_date: visitDateTime,
        location: data.location,
        clientName,
        assignedName,
      });

      setIsVisitSubmitting(false);
      setIsVisitDialogOpen(false);
      toast({ title: 'Visita agendada e tarefa atribuída!' });
      refetch();
      navigate('/tasks');
      return;
    }

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
        assigned_to: data.assigned_to || null,
        delivery_deadline: data.delivery_deadline || null,
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
    {
      const clientName = data.client_id ? clients.find(c => c.id === data.client_id)?.name ?? null : null;
      const assignedName = data.assigned_to ? profiles.find(p => p.user_id === data.assigned_to)?.full_name ?? null : null;
      sendWhatsappNotification(data.status === 'cancelada' ? 'cancel' : 'update', {
        title: data.title,
        visit_date: visitDateTime,
        location: data.location,
        clientName,
        assignedName,
      });
    }
    refetch();
  };

  const getVisitDefaultValues = (): Partial<VisitFormValues> | undefined => {
    if (!editingVisit) {
      return {
        visit_date: selectedDate
          ? `${selectedDate}T${selectedTime || '09:00'}`
          : '',
        status: 'agendada',
        equipment_ids: [],
      };
    }
    
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
      assigned_to: editingVisit.assigned_to || '',
      delivery_deadline: editingVisit.delivery_deadline || '',
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

    // Calculate new end date based on duration
    let newEndDate: Date | null = null;
    if (event.end_date) {
      const originalStart = new Date(event.start_date);
      const originalEnd = new Date(event.end_date);
      const duration = originalEnd.getTime() - originalStart.getTime();
      newEndDate = new Date(newDate.getTime() + duration);
    }

    // Optimistic update - update UI immediately
    updateEventLocally(eventId, newDate, newEndDate);

    // Check if it's a visit event
    if (event.isVisit && event.visitId) {
      // Use ISO string which includes timezone offset - this ensures the
      // database stores the correct UTC time that corresponds to the user's local time
      const { error } = await supabase
        .from('filmmaker_visits')
        .update({
          visit_date: newDate.toISOString(),
        })
        .eq('id', event.visitId);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao mover visita', description: error.message });
        // Revert on error
        refetch();
      } else {
        toast({ title: 'Visita movida com sucesso!' });
      }
    } else {
      // Regular calendar event - use ISO string for timestamp with timezone
      const { error } = await supabase
        .from('calendar_events')
        .update({
          start_date: newDate.toISOString(),
          end_date: newEndDate?.toISOString() || null,
        })
        .eq('id', eventId);

      if (error) {
        toast({ variant: 'destructive', title: 'Erro ao mover evento', description: error.message });
        // Revert on error
        refetch();
      } else {
        toast({ title: 'Evento movido com sucesso!' });
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
        client_id: editingEvent.client_id || '',
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

  // Stats
  const visitCount = events.filter(e => e.event_type === 'visita').length;
  const meetingCount = events.filter(e => e.event_type === 'reuniao').length;
  const demandCount = events.filter(e => e.event_type === 'demanda').length;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  const currentDateFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  if (error) {
    return (
      <div className="space-y-6 animate-in">
        <h1 className="text-2xl font-bold">Calendário</h1>
        <Card>
          <CardContent className="pt-6">
            <ErrorState onRetry={refetch} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground capitalize">{currentDateFormatted}</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">Calendário</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingVisit(null);
              setSelectedDate('');
              setSelectedTime('');
              setIsVisitDialogOpen(true);
            }}
            className="rounded-xl gap-2 h-9"
          >
            <Video className="h-4 w-4" />
            Agendar Visita
          </Button>
          <Button onClick={() => {
            setEditingEvent(null);
            setSelectedDate('');
            setSelectedTime('');
            setIsDialogOpen(true);
          }} className="rounded-xl gap-2 h-9">
            <Plus className="h-4 w-4" />
            Novo Evento
          </Button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Este Mês', value: events.length, icon: CalendarDays, iconBg: 'bg-info/10', iconColor: 'text-info' },
          { label: 'Hoje', value: todayEvents.length, icon: Clock, iconBg: 'bg-success/10', iconColor: 'text-success' },
          { label: 'Visitas', value: visitCount, icon: Video, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Reuniões', value: meetingCount, icon: Users, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600 dark:text-purple-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 transition-all duration-300 hover:shadow-md hover:border-border"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", stat.iconBg)}>
                <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
              </div>
              <div>
                <p className={cn("text-2xl font-bold tabular-nums tracking-tight", stat.iconColor)}>
                  {isLoading ? '—' : stat.value}
                </p>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Legend Chips */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
        {[
          { label: 'Visita', color: '#22c55e' },
          { label: 'Reunião', color: '#a855f7' },
          { label: 'Demanda', color: '#3b82f6' },
          { label: 'Outro', color: '#6b7280' },
          { label: 'Aniversário', color: '#f59e0b' },
          { label: 'Feriado', color: '#ef4444' },
        ].map(({ label, color }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/30"
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </motion.div>

      {/* Calendar Card */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden rounded-2xl border-border/50">
          {/* Navigation Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 border-b border-border/40 bg-card">
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
              <Button variant="ghost" size="icon" onClick={navigatePrevious} className="h-8 w-8 rounded-xl hover:bg-muted">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-base sm:text-lg font-semibold capitalize text-center min-w-[140px] sm:min-w-[200px]">
                {getHeaderTitle()}
              </h2>
              <Button variant="ghost" size="icon" onClick={navigateNext} className="h-8 w-8 rounded-xl hover:bg-muted">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
                <TabsList className="h-8 sm:h-9 rounded-xl">
                  <TabsTrigger value="month" className="text-xs sm:text-sm px-2.5 sm:px-3 rounded-lg">Mês</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs sm:text-sm px-2.5 sm:px-3 rounded-lg">Semana</TabsTrigger>
                  <TabsTrigger value="day" className="text-xs sm:text-sm px-2.5 sm:px-3 rounded-lg">Dia</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="h-8 sm:h-9 text-xs sm:text-sm rounded-xl">
                Hoje
              </Button>
            </div>
          </div>

          <CardContent className="p-2 sm:p-5">
            {isLoading ? (
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
                getHolidayForDate={getHolidayForDate}
              />
            ) : viewType === 'week' ? (
              <div className="h-[60vh] sm:h-[600px] sm:max-h-[600px] overflow-hidden rounded-xl border flex flex-col">
                <WeekView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={handleTimeSlotClick}
                  onEventMove={handleEventMove}
                  onEventDelete={handleDeleteEvent}
                  onDateChange={setCurrentDate}
                />
              </div>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <DayView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={handleTimeSlotClick}
                  onEventMove={handleEventMove}
                  onEventDelete={handleDeleteEvent}
                  onDateChange={setCurrentDate}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Events */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Eventos de Hoje</h2>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
            {todayEvents.length} {todayEvents.length === 1 ? 'evento' : 'eventos'}
          </span>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-border/40">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 animate-pulse">
                  <div className="h-10 w-1 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : todayEvents.length === 0 ? (
            <div className="py-10 px-4">
              <EmptyState
                icon={CalendarDays}
                title="Nenhum evento para hoje"
                description="Clique em um dia do calendário para adicionar um evento"
              />
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {todayEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3.5 hover:bg-muted/40 transition-colors group">
                  <div
                    className="h-10 w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium group-hover:text-primary transition-colors">{event.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_date), 'HH:mm')}
                      </span>
                      {event.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 text-primary/60" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => handleEditEvent(event)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteEvent(event)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Dialogs */}
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
        clients={clients}
        isEditing={!!editingEvent}
        isLoading={isSubmitting}
      />

      <DayEventsDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        date={selectedDay}
        events={selectedDayEvents}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        onAddNew={handleAddNewFromDay}
        holiday={selectedDay ? getHolidayForDate(format(selectedDay, 'yyyy-MM-dd')) : null}
      />

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
        profiles={profiles}
        isEditing={!!editingVisit}
        isLoading={isVisitSubmitting}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={eventToDelete?.isVisit ? 'Excluir Visita' : 'Excluir Evento'}
        description={`Tem certeza que deseja excluir "${eventToDelete?.title}"?${eventToDelete?.isVisit ? ' A tarefa de entrega vinculada também será removida.' : ''} Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
        isLoading={isDeleting}
      />
    </motion.div>
  );
}