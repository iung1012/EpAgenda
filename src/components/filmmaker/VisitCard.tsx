import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  MapPin, 
  Calendar, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pencil, 
  Trash2,
  Building2,
  MoreHorizontal
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
  description: string | null;
}

interface Visit {
  id: string;
  filmmaker_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  visit_date: string;
  status: 'agendada' | 'realizada' | 'cancelada';
  notes: string | null;
  created_at: string;
  client?: Client | null;
  equipment?: Equipment[];
}

interface VisitCardProps {
  visit: Visit;
  onEdit: (visit: Visit) => void;
  onDelete: (id: string, title: string) => void;
  canDelete: boolean;
}

export function VisitCard({ visit, onEdit, onDelete, canDelete }: VisitCardProps) {
  const visitDate = new Date(visit.visit_date);
  const isDateToday = isToday(visitDate);
  const isDateTomorrow = isTomorrow(visitDate);
  const isDatePast = isPast(visitDate) && !isDateToday;
  const isScheduled = visit.status === 'agendada';

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'agendada':
        return {
          icon: Clock,
          label: 'Agendada',
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'realizada':
        return {
          icon: CheckCircle,
          label: 'Realizada',
          className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      case 'cancelada':
        return {
          icon: XCircle,
          label: 'Cancelada',
          className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        };
      default:
        return null;
    }
  };

  const getDateLabel = () => {
    if (isDateToday) return 'Hoje';
    if (isDateTomorrow) return 'Amanhã';
    return format(visitDate, "dd 'de' MMMM", { locale: ptBR });
  };

  const statusConfig = getStatusConfig(visit.status);

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        "border-border/40 bg-card/50 backdrop-blur-sm",
        isScheduled && isDateToday && "ring-2 ring-primary/20 border-primary/30",
        visit.status === 'cancelada' && "opacity-60"
      )}
    >
      {/* Accent line */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5",
          visit.status === 'agendada' && "bg-gradient-to-r from-amber-500 to-orange-500",
          visit.status === 'realizada' && "bg-gradient-to-r from-emerald-500 to-teal-500",
          visit.status === 'cancelada' && "bg-gradient-to-r from-red-500 to-rose-500"
        )}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {statusConfig && (
                <Badge 
                  variant="outline" 
                  className={cn("gap-1 text-[10px] font-medium px-2 py-0", statusConfig.className)}
                >
                  <statusConfig.icon className="h-3 w-3" />
                  {statusConfig.label}
                </Badge>
              )}
              {isScheduled && isDateToday && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0">
                  Hoje
                </Badge>
              )}
              {isScheduled && isDatePast && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted px-2 py-0">
                  Atrasada
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-base tracking-tight line-clamp-1">
              {visit.title}
            </h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit(visit)} className="gap-2">
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(visit.id, visit.title)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Info Grid */}
        <div className="space-y-3">
          {/* Date & Time */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{getDateLabel()}</span>
              <span className="text-xs text-muted-foreground">
                {format(visitDate, "HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Client */}
          {visit.client && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">{visit.client.name}</span>
            </div>
          )}

          {/* Location */}
          {visit.location && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-muted-foreground line-clamp-1">{visit.location}</span>
            </div>
          )}
        </div>

        {/* Equipment Tags */}
        {visit.equipment && visit.equipment.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Package className="h-3.5 w-3.5 text-muted-foreground mr-1" />
              {visit.equipment.slice(0, 3).map((eq) => (
                <span 
                  key={eq.id} 
                  className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium"
                >
                  {eq.name}
                </span>
              ))}
              {visit.equipment.length > 3 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                  +{visit.equipment.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Description Preview */}
        {visit.description && (
          <p className="mt-3 text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
            {visit.description}
          </p>
        )}
      </div>
    </Card>
  );
}
