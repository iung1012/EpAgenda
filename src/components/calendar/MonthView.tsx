import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Holiday } from '@/hooks/useHolidays';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  getEventsForDay: (date: Date) => CalendarEvent[];
  onDayClick: (day: Date) => void;
  getHolidayForDate?: (dateStr: string) => Holiday | null;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const weekDaysMobile = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function MonthView({ currentDate, events, getEventsForDay, onDayClick, getHolidayForDate }: MonthViewProps) {
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
          <div key={day} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2.5">
            {day}
          </div>
        ))}
      </div>

      {/* Week days header - Mobile */}
      <div className="grid sm:hidden grid-cols-7 gap-0.5 mb-1">
        {weekDaysMobile.map((day, index) => (
          <div key={index} className="text-center text-xs font-semibold text-muted-foreground py-1.5">
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
          const holiday = getHolidayForDate?.(format(day, 'yyyy-MM-dd'));

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`
                min-h-[100px] lg:min-h-[120px] p-2 rounded-xl text-left transition-all duration-200 border
                ${isCurrentMonth 
                  ? 'bg-card border-border/30 hover:border-border hover:shadow-sm' 
                  : 'bg-muted/20 border-transparent text-muted-foreground/60 hover:bg-muted/40'}
                ${isToday ? 'ring-2 ring-primary/80 border-primary/30 shadow-sm' : ''}
              `}
            >
              <div className="flex items-center gap-1.5">
                <span className={`
                  inline-flex items-center justify-center h-7 w-7 rounded-lg text-sm font-semibold
                  ${isToday ? 'bg-primary text-primary-foreground' : ''}
                `}>
                  {format(day, 'd')}
                </span>
                {holiday && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] font-medium text-red-400 truncate max-w-[80px] lg:max-w-[100px]">
                          🔴 {holiday.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {holiday.name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="text-[11px] px-1.5 py-0.5 rounded-md truncate font-medium"
                    style={{ backgroundColor: event.color || '#3b82f6', color: 'white' }}
                    title={event.client_name ? `${event.title} - ${event.client_name}` : event.title}
                  >
                    {event.client_name ? `${event.title} · ${event.client_name}` : event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[11px] text-muted-foreground font-medium px-1">
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
          const holiday = getHolidayForDate?.(format(day, 'yyyy-MM-dd'));

          return (
            <TooltipProvider key={day.toISOString()} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDayClick(day)}
                    className={`
                      aspect-square p-1 rounded-lg text-center transition-all duration-200 flex flex-col items-center justify-start border
                      ${isCurrentMonth 
                        ? 'bg-card border-border/20 active:bg-accent' 
                        : 'bg-transparent border-transparent text-muted-foreground/50'}
                      ${isToday ? 'ring-2 ring-primary border-primary/30' : ''}
                    `}
                  >
                    <span className={`
                      inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-semibold
                      ${isToday ? 'bg-primary text-primary-foreground' : ''}
                      ${holiday && !isToday ? 'text-red-400' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full">
                      {holiday && (
                        <div className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-red-400" />
                      )}
                      {hasEvents && dayEvents.slice(0, holiday ? 2 : 3).map((event) => (
                        <div
                          key={event.id}
                          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                        />
                      ))}
                      {dayEvents.length > (holiday ? 2 : 3) && (
                        <span className="text-[8px] text-muted-foreground ml-0.5">+{dayEvents.length - (holiday ? 2 : 3)}</span>
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                {holiday && (
                  <TooltipContent side="top" className="text-xs">
                    🔴 {holiday.name}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
