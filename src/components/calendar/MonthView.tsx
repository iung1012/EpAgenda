import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarEvent } from '@/hooks/useCalendarEvents';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  getEventsForDay: (date: Date) => CalendarEvent[];
  onDayClick: (day: Date) => void;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function MonthView({ currentDate, events, getEventsForDay, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <>
      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
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
                    title={event.client_name ? `${event.title} - ${event.client_name}` : event.title}
                  >
                    {event.client_name ? `${event.title} • ${event.client_name}` : event.title}
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
    </>
  );
}
