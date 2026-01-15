import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  getEventsForDay: (date: Date) => CalendarEvent[];
  onDayClick: (day: Date) => void;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const weekDaysMobile = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function MonthView({ currentDate, events, getEventsForDay, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="w-full">
      {/* Week days header - Desktop */}
      <div className="hidden sm:grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Week days header - Mobile */}
      <div className="grid sm:hidden grid-cols-7 gap-0.5 mb-1">
        {weekDaysMobile.map((day, index) => (
          <div key={index} className="text-center text-xs font-medium text-muted-foreground py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days - Desktop */}
      <div className="hidden sm:grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`
                min-h-[100px] lg:min-h-[120px] p-2 rounded-lg text-left transition-all duration-200
                ${isCurrentMonth ? 'bg-secondary/30 hover:bg-secondary/50' : 'bg-secondary/10 text-muted-foreground hover:bg-secondary/20'}
                ${isToday ? 'ring-2 ring-primary shadow-md' : ''}
              `}
            >
              <span className={`
                inline-flex items-center justify-center h-7 w-7 rounded-full text-sm font-medium
                ${isToday ? 'bg-primary text-primary-foreground' : ''}
              `}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-xs px-1.5 py-0.5 rounded truncate font-medium shadow-sm"
                    style={{ backgroundColor: event.color || '#3b82f6', color: 'white' }}
                    title={event.client_name ? `${event.title} - ${event.client_name}` : event.title}
                  >
                    {event.client_name ? `${event.title} • ${event.client_name}` : event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground font-medium">
                    +{dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Calendar days - Mobile */}
      <div className="grid sm:hidden grid-cols-7 gap-0.5">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`
                aspect-square p-1 rounded-md text-center transition-all duration-200 flex flex-col items-center justify-start
                ${isCurrentMonth ? 'bg-secondary/30 active:bg-secondary/60' : 'bg-secondary/10 text-muted-foreground'}
                ${isToday ? 'ring-2 ring-primary' : ''}
              `}
            >
              <span className={`
                inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium
                ${isToday ? 'bg-primary text-primary-foreground' : ''}
              `}>
                {format(day, 'd')}
              </span>
              {/* Event indicators */}
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color || '#3b82f6' }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
