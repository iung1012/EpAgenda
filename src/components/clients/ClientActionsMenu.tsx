import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientActionsMenuProps {
  archived: boolean;
  onArchiveToggle: () => void;
  onDelete: () => void;
  className?: string;
}

export function ClientActionsMenu({ archived, onArchiveToggle, onDelete, className }: ClientActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7 rounded-lg', className)}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchiveToggle(); }}>
          {archived ? (
            <><ArchiveRestore className="h-4 w-4 mr-2" /> Desarquivar</>
          ) : (
            <><Archive className="h-4 w-4 mr-2" /> Arquivar</>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-4 w-4 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
