import { Search, Filter, X, Calendar, User, Building2, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string;
  user_id: string;
}

interface Client {
  id: string;
  name: string;
}

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string;
  onPriorityChange: (value: string) => void;
  assignedFilter: string;
  onAssignedChange: (value: string) => void;
  clientFilter: string;
  onClientChange: (value: string) => void;
  profiles: Profile[];
  clients: Client[];
  activeFiltersCount: number;
  onClearFilters: () => void;
}

export function TaskFilters({
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  assignedFilter,
  onAssignedChange,
  clientFilter,
  onClientChange,
  profiles,
  clients,
  activeFiltersCount,
  onClearFilters,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 bg-background/50 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <AnimatePresence>
            {searchTerm && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => onSearchChange('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Filter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "gap-2 h-10 rounded-xl border-border/50 hover:bg-muted/50 transition-all",
                activeFiltersCount > 0 && "border-primary/50 bg-primary/5"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              <AnimatePresence>
                {activeFiltersCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Badge 
                      variant="default" 
                      className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
                    >
                      {activeFiltersCount}
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 rounded-xl p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filtros</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-destructive"
                    onClick={onClearFilters}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <div className="p-1 rounded bg-muted">
                    <Calendar className="h-3 w-3" />
                  </div>
                  Prioridade
                </label>
                <Select value={priorityFilter} onValueChange={onPriorityChange}>
                  <SelectTrigger className="w-full h-9 rounded-lg">
                    <SelectValue placeholder="Todas as prioridades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as prioridades</SelectItem>
                    <SelectItem value="alta">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                        Alta
                      </span>
                    </SelectItem>
                    <SelectItem value="media">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-warning" />
                        Média
                      </span>
                    </SelectItem>
                    <SelectItem value="baixa">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                        Baixa
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <div className="p-1 rounded bg-muted">
                    <User className="h-3 w-3" />
                  </div>
                  Responsável
                </label>
                <Select value={assignedFilter} onValueChange={onAssignedChange}>
                  <SelectTrigger className="w-full h-9 rounded-lg">
                    <SelectValue placeholder="Todos os responsáveis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os responsáveis</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.user_id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Client Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                  <div className="p-1 rounded bg-muted">
                    <Building2 className="h-3 w-3" />
                  </div>
                  Cliente
                </label>
                <Select value={clientFilter} onValueChange={onClientChange}>
                  <SelectTrigger className="w-full h-9 rounded-lg">
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters badges */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {priorityFilter !== 'all' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge 
                  variant="secondary" 
                  className="gap-1.5 py-1 px-2.5 rounded-lg hover:bg-secondary/80 cursor-pointer"
                  onClick={() => onPriorityChange('all')}
                >
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    priorityFilter === 'alta' ? 'bg-destructive' : 
                    priorityFilter === 'media' ? 'bg-warning' : 'bg-muted-foreground'
                  )} />
                  {priorityFilter === 'alta' ? 'Alta' : priorityFilter === 'media' ? 'Média' : 'Baixa'}
                  <X className="h-3 w-3 ml-0.5" />
                </Badge>
              </motion.div>
            )}
            {assignedFilter !== 'all' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge 
                  variant="secondary" 
                  className="gap-1.5 py-1 px-2.5 rounded-lg hover:bg-secondary/80 cursor-pointer"
                  onClick={() => onAssignedChange('all')}
                >
                  <User className="h-3 w-3" />
                  {profiles.find(p => p.user_id === assignedFilter)?.full_name}
                  <X className="h-3 w-3 ml-0.5" />
                </Badge>
              </motion.div>
            )}
            {clientFilter !== 'all' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge 
                  variant="secondary" 
                  className="gap-1.5 py-1 px-2.5 rounded-lg hover:bg-secondary/80 cursor-pointer"
                  onClick={() => onClientChange('all')}
                >
                  <Building2 className="h-3 w-3" />
                  {clients.find(c => c.id === clientFilter)?.name}
                  <X className="h-3 w-3 ml-0.5" />
                </Badge>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
