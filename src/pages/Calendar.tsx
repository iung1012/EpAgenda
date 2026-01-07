import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/layout/StatsCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { CalendarDaySkeleton, StatsSkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  location: string | null;
  client_id: string | null;
  assigned_to: string | null;
  color: string | null;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'demanda',
    start_date: '',
    start_time: '09:00',
    end_time: '10:00',
    all_day: false,
    location: '',
    assigned_to: '',
  });

  const { user } = useAuth();
  const { toast } = useToast();

  const fetchEvents = async () => {
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
      setEvents(data);
    }
    setIsLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, user_id, full_name');
    if (data) {
      setProfiles(data);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchProfiles();
  }, [currentDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.start_date) {
      toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios' });
      return;
    }

    setIsSubmitting(true);

    const startDateTime = formData.all_day 
      ? new Date(formData.start_date).toISOString()
      : new Date(`${formData.start_date}T${formData.start_time}`).toISOString();

    const endDateTime = formData.all_day 
      ? null
      : new Date(`${formData.start_date}T${formData.end_time}`).toISOString();

    const { error } = await supabase.from('calendar_events').insert({
      title: formData.title,
      description: formData.description || null,
      event_type: formData.event_type,
      start_date: startDateTime,
      end_date: endDateTime,
      all_day: formData.all_day,
      location: formData.location || null,
      assigned_to: formData.assigned_to || null,
      created_by: user?.id,
      color: getEventColor(formData.event_type),
    });

    setIsSubmitting(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao criar evento', description: error.message });
    } else {
      toast({ title: 'Evento criado com sucesso!' });
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        event_type: 'demanda',
        start_date: '',
        start_time: '09:00',
        end_time: '10:00',
        all_day: false,
        location: '',
        assigned_to: '',
      });
      fetchEvents();
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'demanda': return '#3b82f6';
      case 'visita': return '#22c55e';
      case 'reuniao': return '#a855f7';
      default: return '#6b7280';
    }
  };

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_date), date));
  };

  const handleDateClick = (date: Date) => {
    setFormData(prev => ({
      ...prev,
      start_date: format(date, 'yyyy-MM-dd'),
    }));
    setIsDialogOpen(true);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const todayEvents = getEventsForDay(new Date());

  if (error) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader title="Calendário" description="Gerencie eventos, demandas e visitas" />
        <Card>
          <CardContent className="pt-6">
            <ErrorState onRetry={fetchEvents} />
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Evento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título do evento"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.event_type}
                      onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="demanda">Demanda</SelectItem>
                        <SelectItem value="visita">Visita</SelectItem>
                        <SelectItem value="reuniao">Reunião</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.user_id} value={profile.user_id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora Início</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Fim</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Endereço ou local do evento"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalhes do evento..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Criar Evento'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
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

      {/* Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-xl">
              {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoje
          </Button>
        </CardHeader>
        <CardContent>
          {/* Week days header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => (
                <CalendarDaySkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={`
                      min-h-[100px] p-2 rounded-lg text-left transition-colors
                      ${isCurrentMonth ? 'bg-secondary/30 hover:bg-secondary/50' : 'bg-secondary/10 text-muted-foreground'}
                      ${isToday ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    <span className={`
                      inline-flex items-center justify-center h-7 w-7 rounded-full text-sm
                      ${isToday ? 'bg-primary text-primary-foreground font-medium' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate"
                          style={{ backgroundColor: event.color || '#3b82f6', color: 'white' }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} mais
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
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
                <div key={event.id} className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
