import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { CalendarIcon, Clock, Pencil, Trash2, User } from 'lucide-react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useState, useEffect, useRef } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onEventMove?: (eventId: string, newDate: Date) => void;
  onEventDelete?: (event: CalendarEvent) => void;
  onDateChange?: (date: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WORKING_HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h às 21h (horário comercial)

interface DraggableEventProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  compact?: boolean;
}

function DraggableEvent({ event, onClick, onDelete, compact = false }: DraggableEventProps) {
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
        className={`group absolute inset-x-0.5 top-0.5 p-0.5 rounded text-[10px] text-white z-10 overflow-hidden touch-none ${
          isDragging ? 'opacity-40' : 'active:scale-95'
        }`}
        onClick={handleClick}
        {...listeners}
        {...attributes}
      >
        <div className="font-medium truncate leading-tight">{event.title}</div>
        <div className="opacity-80 text-[9px]">{format(new Date(event.start_date), 'HH:mm')}</div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group absolute inset-x-0.5 top-0.5 p-1.5 rounded text-xs text-white z-10 overflow-hidden transition-all duration-200 touch-none ${
        isDragging 
          ? 'opacity-40 scale-95 ring-2 ring-primary ring-offset-2 cursor-grabbing' 
          : 'cursor-grab hover:scale-[1.02] hover:shadow-lg hover:z-20'
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0" onClick={handleClick}>
          <div className="font-semibold truncate leading-tight" title={event.client_name ? `${event.title} - ${event.client_name}` : event.title}>
            {event.title}
          </div>
          {event.client_name && (
            <div className="flex items-center gap-1 opacity-90 truncate mt-0.5">
              <User className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate text-[10px]">{event.client_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1 opacity-80 mt-0.5">
            <Clock className="h-2.5 w-2.5" />
            <span className="text-[10px]">{format(new Date(event.start_date), 'HH:mm')}</span>
          </div>
        </div>
        <div className="hidden sm:flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-white/80 hover:text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              onClick(event);
            }}
          >
            <Pencil className="h-2.5 w-2.5" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-white/80 hover:text-white hover:bg-red-500/50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event);
              }}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface DroppableSlotProps {
  day: Date;
  hour: number;
  children: React.ReactNode;
  onClick: () => void;
  isToday: boolean;
  isCurrentHour?: boolean;
  currentMinuteOffset?: number;
  compact?: boolean;
}

function DroppableSlot({ day, hour, children, onClick, isToday, isCurrentHour, currentMinuteOffset, compact = false }: DroppableSlotProps) {
  const slotId = `${format(day, 'yyyy-MM-dd')}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { day, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-b relative cursor-pointer transition-all duration-200",
        compact ? "h-12" : "h-14 sm:h-16",
        isOver && 'bg-primary/20 ring-2 ring-inset ring-primary/50',
        !isOver && 'hover:bg-secondary/30',
        isToday && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      {isOver && !compact && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
            Soltar
          </div>
        </div>
      )}
      {isCurrentHour && currentMinuteOffset !== undefined && (
        <div 
          className="absolute left-0 right-0 h-0.5 bg-destructive z-20"
          style={{ top: `${(currentMinuteOffset / 60) * 100}%` }}
        />
      )}
      {children}
    </div>
  );
}

export function WeekView({ currentDate, events, onEventClick, onTimeSlotClick, onEventMove, onEventDelete, onDateChange }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (hasScrolledRef.current) return;
    
    const now = new Date();
    const currentHour = now.getHours();
    const hourHeight = 64; // h-16 = 64px for desktop
    const mobileHourHeight = 48; // h-12 = 48px for mobile
    const scrollOffset = Math.max(0, (currentHour - 1) * hourHeight);
    const mobileScrollOffset = Math.max(0, (currentHour - 7 - 1) * mobileHourHeight); // Adjust for working hours starting at 7
    
    setTimeout(() => {
      if (desktopScrollRef.current) {
        desktopScrollRef.current.scrollTop = scrollOffset;
      }
      if (mobileScrollRef.current) {
        const scrollArea = mobileScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          scrollArea.scrollTop = mobileScrollOffset > 0 ? mobileScrollOffset : 0;
        }
      }
      hasScrolledRef.current = true;
    }, 100);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getEventsForDayAndHour = (day: Date, hour: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, day) && eventDate.getHours() === hour;
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
      {/* Week header with datepicker */}
      <div className="p-2 sm:p-3 border-b flex items-center justify-center gap-2 bg-secondary/20">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
          <span className="hidden sm:inline">{format(weekStart, "d 'de' MMM", { locale: ptBR })} - {format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
          <span className="sm:hidden">{format(weekStart, "d MMM", { locale: ptBR })} - {format(weekEnd, "d MMM", { locale: ptBR })}</span>
        </span>
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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Desktop View */}
        <div className="hidden sm:block overflow-auto max-h-[600px]" ref={desktopScrollRef}>
          <div className="min-w-[700px] relative">
            {/* Current time line across all columns */}
            {days.some(day => isSameDay(day, new Date())) && (
              <div 
                className="absolute left-[12.5%] right-0 h-0.5 bg-destructive z-30 pointer-events-none"
                style={{ 
                  top: `${48 + (currentTime.getHours() * 64) + (currentTime.getMinutes() / 60 * 64)}px` 
                }}
              >
                <div className="absolute left-0 -top-1.5 w-3 h-3 rounded-full bg-destructive -translate-x-1/2" />
              </div>
            )}
            
            {/* Header with days */}
            <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-20">
              <div className="p-2 text-center text-xs font-medium text-muted-foreground border-r">
                Hora
              </div>
              {days.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-2 text-center border-r last:border-r-0 transition-colors",
                      isToday && 'bg-primary/10'
                    )}
                  >
                    <div className="text-xs font-medium text-muted-foreground uppercase">
                      {format(day, 'EEE', { locale: ptBR })}
                    </div>
                    <div className={cn(
                      "text-lg font-semibold mt-0.5",
                      isToday ? 'text-primary' : 'text-foreground'
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="grid grid-cols-8">
              <div className="border-r">
                {HOURS.map((hour) => {
                  const isCurrentHour = isSameDay(currentTime, new Date()) && currentTime.getHours() === hour;
                  return (
                    <div
                      key={hour}
                      className={cn(
                        "h-16 border-b text-xs text-muted-foreground p-1 text-right pr-2",
                        isCurrentHour && 'bg-primary/10 font-semibold text-primary'
                      )}
                    >
                      {String(hour).padStart(2, '0')}:00
                    </div>
                  );
                })}
              </div>

              {days.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className="border-r last:border-r-0 relative">
                    {HOURS.map((hour) => {
                      const hourEvents = getEventsForDayAndHour(day, hour);
                      const isCurrentHour = isToday && currentTime.getHours() === hour;
                      return (
                        <DroppableSlot
                          key={hour}
                          day={day}
                          hour={hour}
                          isToday={isToday}
                          isCurrentHour={isCurrentHour}
                          currentMinuteOffset={isCurrentHour ? currentTime.getMinutes() : undefined}
                          onClick={() => onTimeSlotClick(day, `${String(hour).padStart(2, '0')}:00`)}
                        >
                          {hourEvents.map((event) => (
                            <DraggableEvent
                              key={event.id}
                              event={event}
                              onClick={onEventClick}
                              onDelete={onEventDelete}
                            />
                          ))}
                        </DroppableSlot>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile View - Horizontal scroll with compact layout */}
        <ScrollArea className="sm:hidden w-full max-h-[500px]" ref={mobileScrollRef}>
          <div className="min-w-[600px] relative">
            {/* Current time line for mobile */}
            {days.some(day => isSameDay(day, new Date())) && currentTime.getHours() >= 7 && currentTime.getHours() <= 21 && (
              <div 
                className="absolute left-[12.5%] right-0 h-0.5 bg-destructive z-30 pointer-events-none"
                style={{ 
                  top: `${36 + ((currentTime.getHours() - 7) * 48) + (currentTime.getMinutes() / 60 * 48)}px` 
                }}
              >
                <div className="absolute left-0 -top-1 w-2 h-2 rounded-full bg-destructive -translate-x-1/2" />
              </div>
            )}
            
            {/* Header with days */}
            <div className="grid grid-cols-8 border-b sticky top-0 bg-background z-20">
              <div className="p-1.5 text-center text-[10px] font-medium text-muted-foreground border-r">
                
              </div>
              {days.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-1.5 text-center border-r last:border-r-0",
                      isToday && 'bg-primary/10'
                    )}
                  >
                    <div className="text-[10px] font-medium text-muted-foreground uppercase">
                      {format(day, 'EEEEE', { locale: ptBR })}
                    </div>
                    <div className={cn(
                      "text-sm font-semibold",
                      isToday ? 'text-primary' : 'text-foreground'
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time grid - Working hours only for mobile */}
            <div className="grid grid-cols-8">
              <div className="border-r">
                {WORKING_HOURS.map((hour) => {
                  const isCurrentHour = isSameDay(currentTime, new Date()) && currentTime.getHours() === hour;
                  return (
                    <div
                      key={hour}
                      className={cn(
                        "h-12 border-b text-[10px] text-muted-foreground p-0.5 text-right pr-1",
                        isCurrentHour && 'bg-primary/10 font-semibold text-primary'
                      )}
                    >
                      {String(hour).padStart(2, '0')}h
                    </div>
                  );
                })}
              </div>

              {days.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className="border-r last:border-r-0 relative">
                    {WORKING_HOURS.map((hour) => {
                      const hourEvents = getEventsForDayAndHour(day, hour);
                      const isCurrentHour = isToday && currentTime.getHours() === hour;
                      return (
                        <DroppableSlot
                          key={hour}
                          day={day}
                          hour={hour}
                          isToday={isToday}
                          isCurrentHour={isCurrentHour}
                          currentMinuteOffset={isCurrentHour ? currentTime.getMinutes() : undefined}
                          onClick={() => onTimeSlotClick(day, `${String(hour).padStart(2, '0')}:00`)}
                          compact
                        >
                          {hourEvents.map((event) => (
                            <DraggableEvent
                              key={event.id}
                              event={event}
                              onClick={onEventClick}
                              onDelete={onEventDelete}
                              compact
                            />
                          ))}
                        </DroppableSlot>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeEvent && (
            <div
              className="p-2 rounded text-xs text-white shadow-2xl cursor-grabbing ring-2 ring-white/30"
              style={{ 
                backgroundColor: activeEvent.color || '#3b82f6', 
                width: '100px',
                transform: 'rotate(-2deg) scale(1.05)',
              }}
            >
              <div className="font-semibold truncate">{activeEvent.title}</div>
              <div className="flex items-center gap-1 opacity-80 mt-0.5">
                <Clock className="h-2.5 w-2.5" />
                {format(new Date(activeEvent.start_date), 'HH:mm')}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
