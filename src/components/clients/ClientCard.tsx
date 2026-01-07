import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ExternalLink, Palette, Mail, Phone, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Client } from '@/hooks/useClients';

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const hasLinks = client.google_drive_link || client.trello_link;
  const hasContact = client.contact_name || client.contact_email || client.contact_phone;

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border-0 shadow-sm hover:border-primary/20"
      onClick={onClick}
    >
      {/* Color bar based on palette or default */}
      <div 
        className="h-1.5 transition-all group-hover:h-2"
        style={{ 
          background: client.color_palette.length > 0 
            ? `linear-gradient(to right, ${client.color_palette.slice(0, 4).join(', ')})`
            : 'hsl(var(--primary))'
        }}
      />
      
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Logo/Avatar */}
          <Avatar className="h-14 w-14 rounded-xl ring-2 ring-background shadow-md">
            <AvatarImage src={client.logo_url ?? undefined} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-semibold">
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                  {client.name}
                </h3>
                {client.segment && (
                  <Badge variant="secondary" className="mt-1 text-xs font-normal">
                    {client.segment}
                  </Badge>
                )}
              </div>
            </div>

            {/* Contact Info */}
            {hasContact && (
              <div className="mt-3 space-y-1">
                {client.contact_name && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                    <User className="h-3 w-3 flex-shrink-0" />
                    {client.contact_name}
                  </p>
                )}
                {client.contact_email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    {client.contact_email}
                  </p>
                )}
                {client.contact_phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    {client.contact_phone}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer with palette and links */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
          {/* Color Palette Preview */}
          <div className="flex items-center gap-1.5">
            {client.color_palette.length > 0 ? (
              <>
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex -space-x-1">
                  {client.color_palette.slice(0, 5).map((color, i) => (
                    <div 
                      key={i} 
                      className="h-5 w-5 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Sem paleta definida</span>
            )}
          </div>

          {/* Quick Links */}
          {hasLinks && (
            <div className="flex gap-1.5">
              {client.google_drive_link && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
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
                  className="h-7 w-7"
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
          )}
        </div>
      </CardContent>
    </Card>
  );
}