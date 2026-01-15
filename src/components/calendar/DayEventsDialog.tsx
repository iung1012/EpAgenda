import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, Pencil, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { EmptyState } from '@/components/layout/EmptyState';
import { CalendarDays } from 'lucide-react';

interface DayEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onAddNew: () => void;
}

export function DayEventsDialog({
  open,
  onOpenChange,
  date,
  events,
  onEdit,
  onDelete,
  onAddNew,
}: DayEventsDialogProps) {
  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            <Button size="sm" onClick={onAddNew}>
              Novo Evento
            </Button>
          </DialogTitle>
          <DialogDescription>
            Eventos agendados para este dia
          </DialogDescription>
        </DialogHeader>
        
        {events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum evento"
            description="Adicione um novo evento para este dia"
          />
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 group"
              >
                <div
                  className="h-full w-1 rounded-full flex-shrink-0 self-stretch min-h-[40px]"
                  style={{ backgroundColor: event.color || '#3b82f6' }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{event.title}</h4>
                  <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(event.start_date), 'HH:mm')}
                    </span>
                    {event.client_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{event.client_name}</span>
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{event.location}</span>
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(event)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => onDelete(event)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
