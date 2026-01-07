import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  segments: string[];
  selectedSegment: string | null;
  onSegmentChange: (segment: string | null) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function ClientFilters({
  search,
  onSearchChange,
  segments,
  selectedSegment,
  onSegmentChange,
  viewMode,
  onViewModeChange,
}: ClientFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center border rounded-lg p-1 bg-muted/50">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Segment Filters */}
      {segments.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Segmento:</span>
          <Badge
            variant={selectedSegment === null ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-all",
              selectedSegment === null && "bg-primary hover:bg-primary/90"
            )}
            onClick={() => onSegmentChange(null)}
          >
            Todos
          </Badge>
          {segments.map((segment) => (
            <Badge
              key={segment}
              variant={selectedSegment === segment ? 'default' : 'outline'}
              className={cn(
                "cursor-pointer transition-all",
                selectedSegment === segment && "bg-primary hover:bg-primary/90"
              )}
              onClick={() => onSegmentChange(segment)}
            >
              {segment}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}