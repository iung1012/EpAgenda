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
  compact?: boolean;
}

function DraggableEventCard({ event, onClick, onDelete, compact = false }: DraggableEventCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: event.color || '#3b82f6',
  };

  const [wasDragging, setWasDragging] = useState(false);

  useEffect(() => {
    if (isDragging) {
      setWasDragging(true);
    }
  }, [isDragging]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!wasDragging) {
      onClick(event);
    }
    setTimeout(() => setWasDragging(false), 100);
  };

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex-1 min-w-0 p-1.5 rounded text-xs text-white z-10 transition-all duration-200 touch-none",
          isDragging ? 'opacity-40 scale-95' : 'active:scale-95'
        )}
        onClick={handleClick}
        {...listeners}
        {...attributes}
      >
        <div className="font-semibold truncate leading-tight">{event.title}</div>
        <div className="flex items-center gap-1 opacity-80 mt-0.5">
          <Clock className="h-2.5 w-2.5" />
          <span className="text-[10px]">{format(new Date(event.start_date), 'HH:mm')}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex-1 min-w-[180px] sm:min-w-[200px] max-w-[300px] p-2 sm:p-3 rounded-lg text-sm text-white z-10 transition-all duration-200 touch-none shadow-sm",
        isDragging 
          ? 'opacity-40 scale-95 ring-2 ring-primary ring-offset-2 cursor-grabbing' 
          : 'cursor-grab hover:scale-[1.02] hover:shadow-lg hover:z-20'
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0" onClick={handleClick}>
          <div className="font-semibold truncate leading-tight">{event.title}</div>
          {event.client_name && (
            <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{event.client_name}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs opacity-80">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(event.start_date), 'HH:mm')}
              {event.end_date && ` - ${format(new Date(event.end_date), 'HH:mm')}`}
            </span>
            {event.location && (
              <span className="hidden sm:flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[100px]">{event.location}</span>
              </span>
            )}
          </div>
        </div>
        <div className="hidden sm:flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
  currentMinuteOffset?: number;
  compact?: boolean;
}

function DroppableHourSlot({ currentDate, hour, children, onClick, isCurrentHour, currentMinuteOffset, compact = false }: DroppableHourSlotProps) {
  const slotId = `day-${format(currentDate, 'yyyy-MM-dd')}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { day: currentDate, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-b relative cursor-pointer transition-all duration-200",
        compact ? "min-h-[60px]" : "min-h-[72px] sm:min-h-[80px]",
        isOver && 'bg-primary/20 ring-2 ring-inset ring-primary/50',
        !isOver && 'hover:bg-secondary/30',
        isCurrentHour && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      {isOver && !compact && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="text-xs sm:text-sm font-medium text-primary bg-primary/10 px-2 sm:px-3 py-1 rounded-full animate-pulse shadow-sm">
            Soltar aqui
          </div>
        </div>
      )}
      {isCurrentHour && currentMinuteOffset !== undefined && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-destructive z-20 flex items-center"
          style={{ top: `${(currentMinuteOffset / 60) * 100}%` }}
        >
          <div className="absolute -left-1 sm:-left-1.5 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-destructive" />
        </div>
      )}
      <div className="flex flex-wrap gap-1 p-1 sm:p-1.5">
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isToday && !hasScrolled.current && scrollAreaRef.current) {
      const currentHour = new Date().getHours();
      const scrollPosition = Math.max(0, (currentHour - 2) * 80);
      
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

    if (newDate.getTime() !== originalDate.getTime()) {
      onEventMove(draggedEvent.id, newDate);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className={cn(
        "p-3 sm:p-4 text-center border-b",
        isToday && 'bg-primary/10'
      )}>
        <div className="flex items-center justify-center gap-2">
          <div className="text-base sm:text-lg font-semibold capitalize">
            <span className="hidden sm:inline">{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            <span className="sm:hidden">{format(currentDate, "EEE, d 'de' MMM", { locale: ptBR })}</span>
          </div>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50" align="center">
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
          <div className="text-xs sm:text-sm text-primary font-semibold mt-0.5">Hoje</div>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <ScrollArea className="h-[480px] sm:h-[540px]" ref={scrollAreaRef}>
          {/* Time grid */}
          <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr]">
            {HOURS.map((hour) => {
              const hourEvents = getEventsForHour(hour);
              const isCurrentHour = isToday && currentTime.getHours() === hour;

              return (
                <div key={hour} className="contents">
                  {/* Hour label */}
                  <div className={cn(
                    "min-h-[60px] sm:min-h-[80px] border-b border-r text-xs sm:text-sm text-muted-foreground p-1.5 sm:p-2 text-right",
                    isCurrentHour && 'bg-primary/10 font-semibold text-primary'
                  )}>
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
                    {/* Mobile: compact view */}
                    <div className="sm:hidden flex flex-wrap gap-1 w-full">
                      {hourEvents.map((event) => (
                        <DraggableEventCard
                          key={event.id}
                          event={event}
                          onClick={onEventClick}
                          onDelete={onEventDelete}
                          compact
                        />
                      ))}
                    </div>
                    {/* Desktop: full view */}
                    <div className="hidden sm:flex flex-wrap gap-1">
                      {hourEvents.map((event) => (
                        <DraggableEventCard
                          key={event.id}
                          event={event}
                          onClick={onEventClick}
                          onDelete={onEventDelete}
                        />
                      ))}
                    </div>
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
              className="p-2 rounded-lg text-sm text-white shadow-2xl cursor-grabbing ring-2 ring-white/30"
              style={{ 
                backgroundColor: activeEvent.color || '#3b82f6', 
                width: '160px',
                transform: 'rotate(-2deg) scale(1.05)',
              }}
            >
              <div className="font-semibold truncate">{activeEvent.title}</div>
              <div className="flex items-center gap-1 mt-1 text-xs opacity-80">
                <Clock className="h-3 w-3" />
                {format(new Date(activeEvent.start_date), 'HH:mm')}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
