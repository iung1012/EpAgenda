import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pencil, User, Mail, Phone, Tag, StickyNote } from 'lucide-react';
import ElfsightInstagramFeed from '@/components/clients/ElfsightInstagramFeed';
import { motion } from 'framer-motion';

interface Client {
  id: string;
  name: string;
  segment: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  google_drive_link: string | null;
  canva_link: string | null;
}

interface ClientInfoTabProps {
  client: Client;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (open: boolean) => void;
  editForm: {
    name: string;
    segment: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    google_drive_link: string;
    canva_link: string;
    notes: string;
  };
  setEditForm: (form: any) => void;
  onOpenEditDialog: () => void;
  onEditClient: (e: React.FormEvent) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) => (
  <motion.div variants={itemVariants} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/40">
    <div className="h-9 w-9 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-medium truncate">{value || '—'}</p>
    </div>
  </motion.div>
);

export function ClientInfoTab({
  client,
  isEditDialogOpen,
  setIsEditDialogOpen,
  editForm,
  setEditForm,
  onOpenEditDialog,
  onEditClient,
}: ClientInfoTabProps) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-4"
    >
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informações</h3>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" onClick={onOpenEditDialog} className="h-8 gap-1.5 text-xs">
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Editar Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={onEditClient} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Cliente *</Label>
                    <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Segmento</Label>
                    <Input value={editForm.segment} onChange={(e) => setEditForm({ ...editForm, segment: e.target.value })} placeholder="Ex: Tecnologia, Saúde..." />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Contato</Label>
                      <Input value={editForm.contact_name} onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input value={editForm.contact_phone} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={editForm.contact_email} onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Link Google Drive</Label>
                    <Input value={editForm.google_drive_link} onChange={(e) => setEditForm({ ...editForm, google_drive_link: e.target.value })} placeholder="https://drive.google.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Link Canva</Label>
                    <Input value={editForm.canva_link} onChange={(e) => setEditForm({ ...editForm, canva_link: e.target.value })} placeholder="https://canva.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={User} label="Contato" value={client.contact_name} />
            <InfoRow icon={Mail} label="Email" value={client.contact_email} />
            <InfoRow icon={Phone} label="Telefone" value={client.contact_phone} />
            <InfoRow icon={Tag} label="Segmento" value={client.segment} />
          </div>

          {client.notes && (
            <motion.div variants={itemVariants} className="mt-3 p-3 rounded-xl bg-secondary/40">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Observações</p>
                  <p className="text-sm whitespace-pre-wrap mt-0.5">{client.notes}</p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {client.id === 'cb5332c8-540b-4c7c-859e-4a131575622c' && (
        <ElfsightInstagramFeed appId="e87f6cb1-d6c6-4878-9cc5-5695a4488ad3" />
      )}
    </motion.div>
  );
}
