import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/FileUpload';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ExternalLink,
  Download,
  ImageIcon,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Youtube,
  Share2,
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  segment: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  color_palette: string[];
  social_links: Record<string, string>;
  google_drive_link: string | null;
  trello_link: string | null;
  canva_link: string | null;
  notes: string | null;
}

interface ClientHeaderProps {
  client: Client;
  clientId: string;
  isAdminOrManager: boolean;
  onLogoUpload: (url: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
  onCopyToClipboard: (text: string) => void;
  onDownloadLogo: () => void;
}

const getSocialIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'instagram': return Instagram;
    case 'facebook': return Facebook;
    case 'linkedin': return Linkedin;
    case 'twitter': return Twitter;
    case 'youtube': return Youtube;
    case 'tiktok': return Share2;
    default: return Globe;
  }
};

export function ClientHeader({
  client,
  clientId,
  isAdminOrManager,
  onLogoUpload,
  onEdit,
  onDelete,
  onBack,
  onDownloadLogo,
}: ClientHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          {isAdminOrManager && (
            <Button variant="outline" size="sm" onClick={onDelete} className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Hero section */}
      <div className="flex items-start gap-5">
        <div className="relative flex-shrink-0">
          <FileUpload
            clientId={clientId}
            folder="logos"
            accept="image/*"
            currentUrl={client.logo_url}
            onUploadComplete={onLogoUpload}
            isLogo
          />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            {client.segment && (
              <Badge variant="secondary" className="font-medium">
                {client.segment}
              </Badge>
            )}
          </div>

          {/* Contact quick info */}
          {(client.contact_name || client.contact_email || client.contact_phone) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {client.contact_name && <span>{client.contact_name}</span>}
              {client.contact_email && (
                <a href={`mailto:${client.contact_email}`} className="hover:text-foreground transition-colors">
                  {client.contact_email}
                </a>
              )}
              {client.contact_phone && <span>{client.contact_phone}</span>}
            </div>
          )}

          {/* Quick action links */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {client.logo_url && (
              <>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => window.open(client.logo_url!, '_blank')}>
                  <ImageIcon className="h-3.5 w-3.5" />
                  Logo
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onDownloadLogo}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {client.google_drive_link && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => window.open(client.google_drive_link!, '_blank')}>
                <ExternalLink className="h-3.5 w-3.5" />
                Drive
              </Button>
            )}
            {client.canva_link && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => window.open(client.canva_link!, '_blank')}>
                <ExternalLink className="h-3.5 w-3.5" />
                Canva
              </Button>
            )}
            {Object.entries(client.social_links).map(([platform, url]) => {
              const Icon = getSocialIcon(platform);
              return (
                <Button key={platform} variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => window.open(url, '_blank')}>
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Color palette strip */}
      {client.color_palette.length > 0 && (
        <div className="flex items-center gap-1.5 mt-4">
          {client.color_palette.map((color, i) => (
            <div
              key={i}
              className="h-3 flex-1 first:rounded-l-full last:rounded-r-full max-w-12"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
