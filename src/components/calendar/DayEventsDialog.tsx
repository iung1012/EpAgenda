import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, Pencil, Trash2, User, Plus, CalendarDays } from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';

interface DayEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onAddNew: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } }
};

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

  const dayNumber = format(date, 'd');
  const dayName = format(date, 'EEEE', { locale: ptBR });
  const monthYear = format(date, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-xl border-border/60 shadow-xl">
        {/* Header */}
        <div className="bg-primary/5 border-b border-border/40 px-5 pt-5 pb-4">
          <DialogHeader className="space-y-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <span className="text-lg font-bold leading-none">{dayNumber}</span>
                  <span className="text-[10px] uppercase leading-none mt-0.5 opacity-80">
                    {dayName.slice(0, 3)}
                  </span>
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold capitalize">
                    {dayName}
                  </DialogTitle>
                  <DialogDescription className="text-xs capitalize mt-0.5">
                    {monthYear} · {events.length} {events.length === 1 ? 'evento' : 'eventos'}
                  </DialogDescription>
                </div>
              </div>
              <Button size="sm" onClick={onAddNew} className="gap-1.5 rounded-lg shadow-sm text-xs h-8">
                <Plus className="h-3.5 w-3.5" />
                Novo
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {events.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={CalendarDays}
                title="Nenhum evento"
                description="Adicione um novo evento para este dia"
              />
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-2 max-h-[380px] overflow-y-auto pr-1"
            >
              <AnimatePresence>
                {events.map((event) => (
                  <motion.div
                    key={event.id}
                    variants={itemVariants}
                    className="group relative flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-card hover:bg-accent/30 hover:border-border/60 transition-all duration-200 cursor-default"
                  >
                    {/* Color accent */}
                    <div
                      className="w-1 rounded-full flex-shrink-0 self-stretch min-h-[44px]"
                      style={{ backgroundColor: event.color || 'hsl(var(--primary))' }}
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate text-foreground">
                        {event.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.start_date), 'HH:mm')}
                        </span>
                        {event.client_name && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3 text-primary/60" />
                            <span className="truncate max-w-[130px]">{event.client_name}</span>
                          </span>
                        )}
                        {event.location && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 text-primary/60" />
                            <span className="truncate max-w-[130px]">{event.location}</span>
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-2 leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(event)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(event)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
