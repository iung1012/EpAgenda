import { format, isSameDay, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarIcon, Clock, MapPin, Pencil, Trash2, User } from 'lucide-react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useState, useEffect, useRef } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onEventMove?: (eventId: string, newDate: Date) => void;
  onEventDelete?: (event: CalendarEvent) => void;
  onDateChange?: (date: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface DraggableEventCardProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

function DraggableEventCard({ event, onClick, onDelete }: DraggableEventCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: event.color || '#3b82f6',
  };

  // Track if we're actually dragging to prevent click on drag end
  const [wasDragging, setWasDragging] = useState(false);

  useEffect(() => {
    if (isDragging) {
      setWasDragging(true);
    }
  }, [isDragging]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only trigger click if we weren't just dragging
    if (!wasDragging) {
      onClick(event);
    }
    // Reset after a short delay
    setTimeout(() => setWasDragging(false), 100);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex-1 min-w-[200px] max-w-[300px] p-2 rounded text-sm text-white z-10 transition-all duration-200 touch-none ${
        isDragging 
          ? 'opacity-40 scale-95 ring-2 ring-primary ring-offset-2 cursor-grabbing' 
          : 'cursor-grab hover:scale-[1.02] hover:shadow-lg hover:z-20'
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0" onClick={handleClick}>
          <div className="font-medium truncate">{event.title}</div>
          {event.client_name && (
            <div className="flex items-center gap-1 text-xs opacity-90">
              <User className="h-3 w-3" />
              <span className="truncate">{event.client_name}</span>
            </div>
          )}
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
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onClick(event);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white/80 hover:text-white hover:bg-red-500/50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface DroppableHourSlotProps {
  currentDate: Date;
  hour: number;
  children: React.ReactNode;
  onClick: () => void;
  isCurrentHour: boolean;
}

function DroppableHourSlot({ currentDate, hour, children, onClick, isCurrentHour, currentMinuteOffset }: DroppableHourSlotProps & { currentMinuteOffset?: number }) {
  const slotId = `day-${format(currentDate, 'yyyy-MM-dd')}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { day: currentDate, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-20 border-b relative cursor-pointer transition-all duration-200 ${
        isOver 
          ? 'bg-primary/20 ring-2 ring-inset ring-primary/50 scale-[1.01]' 
          : 'hover:bg-secondary/30'
      } ${isCurrentHour ? 'bg-primary/5' : ''}`}
      onClick={onClick}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full animate-pulse shadow-sm">
            Soltar aqui
          </div>
        </div>
      )}
      {isCurrentHour && currentMinuteOffset !== undefined && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-destructive z-20 flex items-center"
          style={{ top: `${(currentMinuteOffset / 60) * 100}%` }}
        >
          <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-destructive" />
        </div>
      )}
      <div className="flex flex-wrap gap-1 p-1">
        {children}
      </div>
    </div>
  );
}

export function DayView({ currentDate, events, onEventClick, onTimeSlotClick, onEventMove, onEventDelete, onDateChange }: DayViewProps) {
  const isToday = isSameDay(currentDate, new Date());
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const hasScrolled = useRef(false);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current hour on mount (only for today)
  useEffect(() => {
    if (isToday && !hasScrolled.current && scrollAreaRef.current) {
      const currentHour = new Date().getHours();
      // Each hour slot is 80px high, scroll to 2 hours before current for context
      const scrollPosition = Math.max(0, (currentHour - 2) * 80);
      
      // Small delay to ensure content is rendered
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (viewport) {
            viewport.scrollTop = scrollPosition;
            hasScrolled.current = true;
          }
        }
      }, 100);
    }
  }, [isToday, currentDate]);

  // Reset scroll flag when date changes
  useEffect(() => {
    hasScrolled.current = false;
  }, [currentDate]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getEventsForHour = (hour: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, currentDate) && eventDate.getHours() === hour;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const draggedEvent = event.active.data.current?.event as CalendarEvent;
    setActiveEvent(draggedEvent);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveEvent(null);
    
    if (!event.over || !onEventMove) return;

    const { day, hour } = event.over.data.current as { day: Date; hour: number };
    const draggedEvent = event.active.data.current?.event as CalendarEvent;
    
    if (!draggedEvent) return;

    const originalDate = new Date(draggedEvent.start_date);
    const originalMinutes = originalDate.getMinutes();
    
    let newDate = setHours(day, hour);
    newDate = setMinutes(newDate, originalMinutes);

    // Only update if the time actually changed
    if (newDate.getTime() !== originalDate.getTime()) {
      onEventMove(draggedEvent.id, newDate);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <ScrollArea className="h-[600px]" ref={scrollAreaRef}>
        {/* Header */}
        <div className={`p-4 text-center border-b sticky top-0 bg-background z-10 ${isToday ? 'bg-primary/10' : ''}`}>
          <div className="flex items-center justify-center gap-2">
            <div className="text-lg font-medium">
              {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => {
                    if (date && onDateChange) {
                      onDateChange(date);
                      setDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          {isToday && (
            <div className="text-sm text-primary font-medium">Hoje</div>
          )}
        </div>

        {/* Time grid */}
        <div className="grid grid-cols-[80px_1fr]">
          {HOURS.map((hour) => {
            const hourEvents = getEventsForHour(hour);
            const isCurrentHour = isToday && currentTime.getHours() === hour;

            return (
              <div key={hour} className="contents">
                {/* Hour label */}
                <div className={`h-20 border-b border-r text-sm text-muted-foreground p-2 text-right ${isCurrentHour ? 'bg-primary/10 font-medium text-destructive' : ''}`}>
                  {String(hour).padStart(2, '0')}:00
                </div>

                {/* Events area */}
                <DroppableHourSlot
                  currentDate={currentDate}
                  hour={hour}
                  isCurrentHour={isCurrentHour}
                  currentMinuteOffset={isCurrentHour ? currentTime.getMinutes() : undefined}
                  onClick={() => onTimeSlotClick(currentDate, `${String(hour).padStart(2, '0')}:00`)}
                >
                  {hourEvents.map((event) => (
                    <DraggableEventCard
                      key={event.id}
                      event={event}
                      onClick={onEventClick}
                      onDelete={onEventDelete}
                    />
                  ))}
                </DroppableHourSlot>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeEvent && (
          <div
            className="p-2 rounded text-sm text-white shadow-2xl cursor-grabbing ring-2 ring-white/30 animate-pulse"
            style={{ 
              backgroundColor: activeEvent.color || '#3b82f6', 
              width: '200px',
              transform: 'rotate(-2deg) scale(1.05)',
            }}
          >
            <div className="font-medium truncate">{activeEvent.title}</div>
            <div className="flex items-center gap-1 mt-1 text-xs opacity-80">
              <Clock className="h-3 w-3" />
              {format(new Date(activeEvent.start_date), 'HH:mm')}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
