import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, ExternalLink, Palette, Mail, Phone, User, ChevronRight } from 'lucide-react';
import { Client } from '@/hooks/useClients';

interface ClientListItemProps {
  client: Client;
  onClick: () => void;
}

export function ClientListItem({ client, onClick }: ClientListItemProps) {
  return (
    <div 
      className="group flex items-center gap-4 p-4 bg-card rounded-xl border hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Logo/Avatar */}
      <Avatar className="h-12 w-12 rounded-lg ring-2 ring-background shadow">
        <AvatarImage src={client.logo_url ?? undefined} className="object-cover" />
        <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
          {client.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
            {client.name}
          </h3>
          {client.segment && (
            <Badge variant="secondary" className="text-xs font-normal">
              {client.segment}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          {client.contact_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {client.contact_name}
            </span>
          )}
          {client.contact_email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3" />
              {client.contact_email}
            </span>
          )}
          {client.contact_phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {client.contact_phone}
            </span>
          )}
        </div>
      </div>

      {/* Color Palette */}
      {client.color_palette.length > 0 && (
        <div className="hidden sm:flex items-center gap-1">
          {client.color_palette.slice(0, 4).map((color, i) => (
            <div 
              key={i} 
              className="h-4 w-4 rounded-full border border-background shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div className="flex items-center gap-1">
        {client.google_drive_link && (
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              window.open(client.google_drive_link!, '_blank');
            }}
          >
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/1/12/Google_Drive_icon_%282020%29.svg" 
              alt="Google Drive"
              className="h-4 w-4"
            />
          </Button>
        )}
        {client.trello_link && (
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              window.open(client.trello_link!, '_blank');
            }}
          >
            <img 
              src="https://cdn.worldvectorlogo.com/logos/trello.svg" 
              alt="Trello"
              className="h-4 w-4"
            />
          </Button>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  );
}