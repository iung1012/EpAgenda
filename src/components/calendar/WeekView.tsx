import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addHours, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { Clock, MapPin } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({ currentDate, events, onEventClick, onTimeSlotClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, day) && eventDate.getHours() === hour;
    });
  };

  return (
    <div className="overflow-auto">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-10">
        <div className="p-2 text-center text-sm font-medium text-muted-foreground border-r">
          Hora
        </div>
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-r last:border-r-0 ${isToday ? 'bg-primary/10' : ''}`}
            >
              <div className="text-sm font-medium">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={`text-lg ${isToday ? 'text-primary font-bold' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-8">
        {/* Hours column */}
        <div className="border-r">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-16 border-b text-xs text-muted-foreground p-1 text-right pr-2"
            >
              {String(hour).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={`border-r last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
              {HOURS.map((hour) => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                return (
                  <div
                    key={hour}
                    className="h-16 border-b relative cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => onTimeSlotClick(day, `${String(hour).padStart(2, '0')}:00`)}
                  >
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className="absolute inset-x-0.5 top-0.5 p-1 rounded text-xs text-white cursor-pointer z-10 overflow-hidden"
                        style={{ backgroundColor: event.color || '#3b82f6' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="flex items-center gap-1 opacity-80">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(event.start_date), 'HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
