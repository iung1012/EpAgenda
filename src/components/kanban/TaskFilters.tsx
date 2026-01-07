import { Search, Filter, X, Calendar, User, Building2 } from 'lucide-react';
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
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar tarefas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-background"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtros</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={onClearFilters}
                >
                  Limpar todos
                </Button>
              )}
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Prioridade
              </label>
              <Select value={priorityFilter} onValueChange={onPriorityChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as prioridades</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned Filter */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Responsável
              </label>
              <Select value={assignedFilter} onValueChange={onAssignedChange}>
                <SelectTrigger className="w-full">
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
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                Cliente
              </label>
              <Select value={clientFilter} onValueChange={onClientChange}>
                <SelectTrigger className="w-full">
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

      {/* Active filters badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {priorityFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {priorityFilter === 'alta' ? 'Alta' : priorityFilter === 'media' ? 'Média' : 'Baixa'}
              <button onClick={() => onPriorityChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {assignedFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {profiles.find(p => p.user_id === assignedFilter)?.full_name}
              <button onClick={() => onAssignedChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {clientFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {clients.find(c => c.id === clientFilter)?.name}
              <button onClick={() => onClientChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
