import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Palette, Mail, Phone, User, CheckSquare, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client } from '@/hooks/useClients';
import { ClientActionsMenu } from './ClientActionsMenu';

interface TaskCount {
  pending: number;
  total: number;
}

interface ClientCardProps {
  client: Client;
  taskCount?: TaskCount;
  onClick: () => void;
  onArchiveToggle?: () => void;
  onDelete?: () => void;
}

export function ClientCard({ client, taskCount, onClick, onArchiveToggle, onDelete }: ClientCardProps) {
  const hasLinks = client.google_drive_link || client.trello_link || client.canva_link;
  const hasContact = client.contact_name || client.contact_email || client.contact_phone;

  return (
    <Card 
      className="group relative hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border hover:border-primary/20 rounded-2xl"
      onClick={onClick}
    >
      {/* Gradient top bar */}
      <div 
        className="h-1 transition-all duration-300 group-hover:h-1.5"
        style={{ 
          background: client.color_palette.length > 0 
            ? `linear-gradient(to right, ${client.color_palette.slice(0, 4).join(', ')})`
            : 'hsl(var(--primary))'
        }}
      />

      {/* Top-right: actions menu + hover arrow */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {onArchiveToggle && onDelete && (
          <ClientActionsMenu
            archived={client.archived}
            onArchiveToggle={onArchiveToggle}
            onDelete={onDelete}
          />
        )}
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <CardContent className="p-5">
        <div className="flex items-start gap-3.5">
          <Avatar className="h-12 w-12 rounded-xl ring-2 ring-background shadow-md flex-shrink-0">
            <AvatarImage src={client.logo_url ?? undefined} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-sm">
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[15px] truncate group-hover:text-primary transition-colors leading-tight">
              {client.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {client.segment && (
                <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0 h-5 rounded-md">
                  {client.segment}
                </Badge>
              )}
              {taskCount && taskCount.pending > 0 && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "flex items-center gap-0.5 text-[10px] px-1.5 py-0 h-5 rounded-md",
                    taskCount.pending > 5 
                      ? "border-destructive/40 text-destructive bg-destructive/5" 
                      : "border-warning/40 text-warning bg-warning/5"
                  )}
                >
                  <CheckSquare className="h-2.5 w-2.5" />
                  {taskCount.pending}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        {hasContact && (
          <div className="mt-4 space-y-1.5">
            {client.contact_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                <User className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                {client.contact_name}
              </p>
            )}
            {client.contact_email && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                {client.contact_email}
              </p>
            )}
            {client.contact_phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                {client.contact_phone}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
          {client.color_palette.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-0.5">
                {client.color_palette.slice(0, 5).map((color, i) => (
                  <div 
                    key={i} 
                    className="h-4 w-4 rounded-full border-2 border-card shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Sem paleta
            </span>
          )}

          {hasLinks && (
            <div className="flex gap-1">
              {client.google_drive_link && (
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                  onClick={(e) => { e.stopPropagation(); window.open(client.google_drive_link!, '_blank'); }}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" alt="Drive" className="h-3.5 w-3.5" />
                </Button>
              )}
              {client.trello_link && (
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                  onClick={(e) => { e.stopPropagation(); window.open(client.trello_link!, '_blank'); }}>
                  <img src="https://cdn.worldvectorlogo.com/logos/trello.svg" alt="Trello" className="h-3.5 w-3.5" />
                </Button>
              )}
              {client.canva_link && (
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                  onClick={(e) => { e.stopPropagation(); window.open(client.canva_link!, '_blank'); }}>
                  <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Canva_icon_2021.svg" alt="Canva" className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
