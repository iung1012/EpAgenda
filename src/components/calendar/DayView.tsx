import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { Clock, MapPin } from 'lucide-react';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({ currentDate, events, onEventClick, onTimeSlotClick }: DayViewProps) {
  const isToday = isSameDay(currentDate, new Date());

  const getEventsForHour = (hour: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, currentDate) && eventDate.getHours() === hour;
    });
  };

  return (
    <div className="overflow-auto">
      {/* Header */}
      <div className={`p-4 text-center border-b sticky top-0 bg-background z-10 ${isToday ? 'bg-primary/10' : ''}`}>
        <div className="text-lg font-medium">
          {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </div>
        {isToday && (
          <div className="text-sm text-primary font-medium">Hoje</div>
        )}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[80px_1fr]">
        {HOURS.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          const now = new Date();
          const isCurrentHour = isToday && now.getHours() === hour;

          return (
            <div key={hour} className="contents">
              {/* Hour label */}
              <div className={`h-20 border-b border-r text-sm text-muted-foreground p-2 text-right ${isCurrentHour ? 'bg-primary/10' : ''}`}>
                {String(hour).padStart(2, '0')}:00
              </div>

              {/* Events area */}
              <div
                className={`h-20 border-b relative cursor-pointer hover:bg-secondary/30 transition-colors ${isCurrentHour ? 'bg-primary/5' : ''}`}
                onClick={() => onTimeSlotClick(currentDate, `${String(hour).padStart(2, '0')}:00`)}
              >
                {isCurrentHour && (
                  <div className="absolute left-0 right-0 top-0 h-0.5 bg-primary z-20" />
                )}
                <div className="flex flex-wrap gap-1 p-1">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex-1 min-w-[200px] max-w-[300px] p-2 rounded text-sm text-white cursor-pointer z-10"
                      style={{ backgroundColor: event.color || '#3b82f6' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs opacity-80">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.start_date), 'HH:mm')}
                          {event.end_date && ` - ${format(new Date(event.end_date), 'HH:mm')}`}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
