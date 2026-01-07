import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { Clock } from 'lucide-react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import { CSS } from '@dnd-kit/utilities';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onEventMove?: (eventId: string, newDate: Date) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface DraggableEventProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
}

function DraggableEvent({ event, onClick }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: event.color || '#3b82f6',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="absolute inset-x-0.5 top-0.5 p-1 rounded text-xs text-white cursor-grab z-10 overflow-hidden active:cursor-grabbing"
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="flex items-center gap-1 opacity-80">
        <Clock className="h-2.5 w-2.5" />
        {format(new Date(event.start_date), 'HH:mm')}
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
}

function DroppableSlot({ day, hour, children, onClick, isToday }: DroppableSlotProps) {
  const slotId = `${format(day, 'yyyy-MM-dd')}-${hour}`;
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { day, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-16 border-b relative cursor-pointer transition-colors ${
        isOver ? 'bg-primary/20' : 'hover:bg-secondary/30'
      } ${isToday ? 'bg-primary/5' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function WeekView({ currentDate, events, onEventClick, onTimeSlotClick, onEventMove }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

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
              <div key={day.toISOString()} className="border-r last:border-r-0">
                {HOURS.map((hour) => {
                  const hourEvents = getEventsForDayAndHour(day, hour);
                  return (
                    <DroppableSlot
                      key={hour}
                      day={day}
                      hour={hour}
                      isToday={isToday}
                      onClick={() => onTimeSlotClick(day, `${String(hour).padStart(2, '0')}:00`)}
                    >
                      {hourEvents.map((event) => (
                        <DraggableEvent
                          key={event.id}
                          event={event}
                          onClick={onEventClick}
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

      <DragOverlay>
        {activeEvent && (
          <div
            className="p-2 rounded text-xs text-white shadow-lg cursor-grabbing"
            style={{ backgroundColor: activeEvent.color || '#3b82f6', width: '120px' }}
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
