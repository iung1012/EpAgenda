import { useState, forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  User, 
  Building2, 
  Pencil, 
  Trash2, 
  GripVertical,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Link,
  ExternalLink,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'baixa' | 'media' | 'alta';
  due_date: string | null;
  assigned_to: string | null;
  client_id: string | null;
  status: 'a_fazer' | 'fazendo' | 'feito';
  delivery_link: string | null;
}

interface TaskCardProps {
  task: Task;
  getPriorityColor: (priority: 'baixa' | 'media' | 'alta') => string;
  getPriorityLabel: (priority: 'baixa' | 'media' | 'alta') => string;
  getProfileName: (userId: string | null) => string | null;
  getClientName: (clientId: string | null) => string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string, taskTitle: string) => void;
  onQuickComplete?: (taskId: string) => void;
  onReopen?: (taskId: string) => void;
  onAddDeliveryLink?: (taskId: string, link: string) => void;
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(function TaskCard({
  task,
  getPriorityColor,
  getPriorityLabel,
  getProfileName,
  getClientName,
  onEdit,
  onDelete,
  onQuickComplete,
  onReopen,
  onAddDeliveryLink,
}, forwardedRef) {
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkValue, setLinkValue] = useState(task.delivery_link || '');
  const [isHovered, setIsHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const assignedName = getProfileName(task.assigned_to);
  const clientName = getClientName(task.client_id);
  
  const getDueDateInfo = () => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    const isOverdue = isPast(date) && task.status !== 'feito';
    const isDueToday = isToday(date);
    const isDueTomorrow = isTomorrow(date);

    let label = format(date, "dd MMM", { locale: ptBR });
    let className = "text-muted-foreground bg-muted/50";
    let Icon = Clock;

    if (task.status === 'feito') {
      className = "text-success bg-success/10";
      Icon = CheckCircle2;
    } else if (isOverdue) {
      className = "text-destructive bg-destructive/10";
      label = "Atrasada";
      Icon = AlertCircle;
    } else if (isDueToday) {
      className = "text-warning bg-warning/10";
      label = "Hoje";
    } else if (isDueTomorrow) {
      className = "text-info bg-info/10";
      label = "Amanhã";
    }

    return { label, className, Icon };
  };

  const dueDateInfo = getDueDateInfo();

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getPriorityBorderColor = () => {
    switch (task.priority) {
      case 'alta':
        return 'border-l-destructive';
      case 'media':
        return 'border-l-warning';
      case 'baixa':
        return 'border-l-muted-foreground/30';
    }
  };

  const getPriorityGlow = () => {
    if (!isHovered) return '';
    switch (task.priority) {
      case 'alta':
        return 'shadow-[0_0_20px_-5px_hsl(var(--destructive)/0.3)]';
      case 'media':
        return 'shadow-[0_0_20px_-5px_hsl(var(--warning)/0.3)]';
      default:
        return 'shadow-lg';
    }
  };

  // Merge refs for sortable and forwarded ref
  const mergedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  return (
    <motion.div
      ref={mergedRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        "group relative rounded-xl border border-border/60 bg-card overflow-hidden transition-all duration-300",
        "border-l-[3px]",
        getPriorityBorderColor(),
        getPriorityGlow(),
        isDragging && "opacity-50 shadow-2xl ring-2 ring-primary rotate-2 scale-105",
        task.status === 'feito' && "opacity-70"
      )}
    >
      {/* Priority indicator gradient */}
      <div className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
        isHovered && "opacity-100",
        task.priority === 'alta' && "bg-gradient-to-br from-destructive/5 to-transparent",
        task.priority === 'media' && "bg-gradient-to-br from-warning/5 to-transparent"
      )} />

      <div className="relative p-3.5 space-y-3">
        {/* Header with drag handle and priority */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <motion.button
              {...attributes}
              {...listeners}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground mt-0.5 touch-none opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <GripVertical className="h-4 w-4" />
            </motion.button>
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "font-medium text-sm leading-snug tracking-tight",
                task.status === 'feito' && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h4>
              {task.description && (
                <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1.5 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          
          <motion.span 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className={cn(
              "text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 uppercase tracking-wider",
              getPriorityColor(task.priority)
            )}
          >
            {getPriorityLabel(task.priority)}
          </motion.span>
        </div>

        {/* Meta info chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {dueDateInfo && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full",
                dueDateInfo.className
              )}
            >
              <dueDateInfo.Icon className="h-3 w-3" />
              {dueDateInfo.label}
            </motion.span>
          )}
          
          {clientName && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
              <Building2 className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{clientName}</span>
            </span>
          )}
        </div>

        {/* Delivery Link Section - For completed tasks */}
        {task.status === 'feito' && onAddDeliveryLink && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-3 border-t border-dashed border-border/50"
          >
            {isAddingLink ? (
              <div className="flex gap-1.5">
                <Input
                  type="url"
                  placeholder="Cole o link aqui..."
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  className="h-8 text-xs rounded-lg bg-muted/30 border-border/50"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10 rounded-lg shrink-0"
                  onClick={() => {
                    if (linkValue.trim()) {
                      onAddDeliveryLink(task.id, linkValue.trim());
                    }
                    setIsAddingLink(false);
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg shrink-0"
                  onClick={() => {
                    setLinkValue(task.delivery_link || '');
                    setIsAddingLink(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : task.delivery_link ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/20">
                <Sparkles className="h-3.5 w-3.5 text-success shrink-0" />
                <a
                  href={task.delivery_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-success hover:underline truncate flex-1 font-medium"
                >
                  <span className="truncate">{task.delivery_link}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setIsAddingLink(true)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 gap-1.5 rounded-lg border border-dashed border-border/50"
                onClick={() => setIsAddingLink(true)}
              >
                <Link className="h-3.5 w-3.5" />
                Adicionar link de entrega
              </Button>
            )}
          </motion.div>
        )}

        {/* Footer with assignee and actions */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
          <TooltipProvider>
            {assignedName ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 ring-2 ring-background">
                      <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                        {getInitials(assignedName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground font-medium truncate max-w-[70px]">
                      {assignedName.split(' ')[0]}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{assignedName}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground/40">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-muted">
                    <User className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">Não atribuída</span>
              </div>
            )}
          </TooltipProvider>

          {/* Actions */}
          <div className="flex gap-1">
            {/* Quick Complete Button */}
            {task.status !== 'feito' && onQuickComplete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-success hover:text-success hover:bg-success/10 rounded-lg"
                        onClick={() => onQuickComplete(task.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Concluir tarefa</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Reopen Button */}
            {task.status === 'feito' && onReopen && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-warning hover:text-warning hover:bg-warning/10 rounded-lg"
                        onClick={() => onReopen(task.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Reabrir tarefa</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Edit/Delete - show on hover */}
            <motion.div 
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: isHovered ? 1 : 0, width: isHovered ? 'auto' : 0 }}
              className="flex gap-0.5 overflow-hidden"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-lg"
                onClick={() => onEdit(task)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                onClick={() => onDelete(task.id, task.title)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
