import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/layout/EmptyState';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  ExternalLink,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Youtube,
  Share2,
  Globe,
} from 'lucide-react';

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

const socialPlatforms = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'twitter', label: 'Twitter/X', icon: Twitter },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'tiktok', label: 'TikTok', icon: Share2 },
  { value: 'website', label: 'Website', icon: Globe },
];

interface ClientSocialTabProps {
  socialLinks: Record<string, string>;
  isSocialDialogOpen: boolean;
  setIsSocialDialogOpen: (open: boolean) => void;
  socialForm: { platform: string; url: string };
  setSocialForm: (form: { platform: string; url: string }) => void;
  onAddSocialLink: (e: React.FormEvent) => void;
  onRemoveSocialLink: (platform: string) => void;
}

export function ClientSocialTab({
  socialLinks,
  isSocialDialogOpen,
  setIsSocialDialogOpen,
  socialForm,
  setSocialForm,
  onAddSocialLink,
  onRemoveSocialLink,
}: ClientSocialTabProps) {
  const entries = Object.entries(socialLinks);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Redes Sociais</h3>
            <Dialog open={isSocialDialogOpen} onOpenChange={setIsSocialDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Rede Social</DialogTitle>
                </DialogHeader>
                <form onSubmit={onAddSocialLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select value={socialForm.platform} onValueChange={(v) => setSocialForm({ ...socialForm, platform: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {socialPlatforms.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <div className="flex items-center gap-2">
                              <p.icon className="h-4 w-4" />
                              {p.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>URL *</Label>
                    <Input value={socialForm.url} onChange={(e) => setSocialForm({ ...socialForm, url: e.target.value })} placeholder="https://instagram.com/usuario" required />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsSocialDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Adicionar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {entries.length === 0 ? (
            <EmptyState icon={Share2} title="Nenhuma rede social" description="Adicione os links das redes sociais" />
          ) : (
            <div className="space-y-2">
              {entries.map(([platform, url]) => {
                const Icon = getSocialIcon(platform);
                const info = socialPlatforms.find(p => p.value === platform.toLowerCase());
                return (
                  <div key={platform} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{info?.label || platform}</p>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground truncate block max-w-[250px]">
                          {url}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(url, '_blank')}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onRemoveSocialLink(platform)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
