import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useState, useEffect } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onEventMove?: (eventId: string, newDate: Date) => void;
  onEventDelete?: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface DraggableEventProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

function DraggableEvent({ event, onClick, onDelete }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: event.color || '#3b82f6',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group absolute inset-x-0.5 top-0.5 p-1 rounded text-xs text-white z-10 overflow-hidden transition-all duration-200 ${
        isDragging 
          ? 'opacity-40 scale-95 ring-2 ring-primary ring-offset-2 cursor-grabbing' 
          : 'cursor-grab hover:scale-[1.02] hover:shadow-md hover:z-20'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{event.title}</div>
          <div className="flex items-center gap-1 opacity-80">
            <Clock className="h-2.5 w-2.5" />
            {format(new Date(event.start_date), 'HH:mm')}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
}

function DroppableSlot({ day, hour, children, onClick, isToday, isCurrentHour, currentMinuteOffset }: DroppableSlotProps) {
  const slotId = `${format(day, 'yyyy-MM-dd')}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { day, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-16 border-b relative cursor-pointer transition-all duration-200 ${
        isOver 
          ? 'bg-primary/20 ring-2 ring-inset ring-primary/50 scale-[1.02]' 
          : 'hover:bg-secondary/30'
      } ${isToday ? 'bg-primary/5' : ''}`}
      onClick={onClick}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full animate-pulse">
            Soltar aqui
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

export function WeekView({ currentDate, events, onEventClick, onTimeSlotClick, onEventMove, onEventDelete }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
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

    // Only update if the date/time actually changed
    if (newDate.getTime() !== originalDate.getTime()) {
      onEventMove(draggedEvent.id, newDate);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
            {HOURS.map((hour) => {
              const isCurrentHour = isSameDay(currentTime, new Date()) && currentTime.getHours() === hour;
              return (
                <div
                  key={hour}
                  className={`h-16 border-b text-xs text-muted-foreground p-1 text-right pr-2 ${isCurrentHour ? 'bg-primary/10 font-medium text-destructive' : ''}`}
                >
                  {String(hour).padStart(2, '0')}:00
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="border-r last:border-r-0 relative">
                {/* Current time indicator for today column */}
                {isToday && (
                  <div 
                    className="absolute left-0 w-2 h-2 rounded-full bg-destructive z-30 -translate-x-1/2"
                    style={{ top: `${((currentTime.getHours() * 60 + currentTime.getMinutes()) / (24 * 60)) * (16 * 24)}px` }}
                  />
                )}
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

      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeEvent && (
          <div
            className="p-2 rounded text-xs text-white shadow-2xl cursor-grabbing ring-2 ring-white/30 animate-pulse"
            style={{ 
              backgroundColor: activeEvent.color || '#3b82f6', 
              width: '120px',
              transform: 'rotate(-2deg) scale(1.05)',
            }}
          >
            <div className="font-medium truncate">{activeEvent.title}</div>
            <div className="flex items-center gap-1 opacity-80">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(activeEvent.start_date), 'HH:mm')}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
