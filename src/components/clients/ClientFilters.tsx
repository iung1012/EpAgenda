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
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, segmento, contato..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 h-10 rounded-xl bg-muted/50 border-border/50 focus:bg-card"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* View Mode */}
        <div className="flex items-center rounded-xl border bg-muted/30 p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className={cn("h-9 w-9 rounded-[10px]", viewMode === 'grid' && "shadow-sm")}
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className={cn("h-9 w-9 rounded-[10px]", viewMode === 'list' && "shadow-sm")}
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Segment Pills */}
      {segments.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant={selectedSegment === null ? 'default' : 'outline'}
            className={cn(
              "cursor-pointer transition-all text-xs rounded-lg px-3 py-1",
              selectedSegment === null ? "bg-primary hover:bg-primary/90 shadow-sm" : "hover:bg-muted"
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
                "cursor-pointer transition-all text-xs rounded-lg px-3 py-1",
                selectedSegment === segment ? "bg-primary hover:bg-primary/90 shadow-sm" : "hover:bg-muted"
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
