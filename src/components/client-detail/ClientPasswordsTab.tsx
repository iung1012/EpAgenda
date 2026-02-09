import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/layout/EmptyState';
import { motion } from 'framer-motion';
import { Plus, Trash2, Eye, EyeOff, Copy, Pencil, Lock, Shield } from 'lucide-react';

interface ClientPassword {
  id: string;
  service_name: string;
  username: string | null;
  encrypted_password: string;
  notes: string | null;
}

interface ClientPasswordsTabProps {
  passwords: ClientPassword[];
  visiblePasswords: Set<string>;
  isPasswordDialogOpen: boolean;
  setIsPasswordDialogOpen: (open: boolean) => void;
  editingPassword: ClientPassword | null;
  passwordForm: { service_name: string; username: string; password: string; notes: string };
  setPasswordForm: (form: any) => void;
  onToggleVisibility: (id: string) => void;
  onCopyToClipboard: (text: string) => void;
  onAddPassword: (e: React.FormEvent) => void;
  onEditPassword: (pwd: ClientPassword) => void;
  onDeletePassword: (id: string, name: string) => void;
  onResetForm: () => void;
}

export function ClientPasswordsTab({
  passwords,
  visiblePasswords,
  isPasswordDialogOpen,
  setIsPasswordDialogOpen,
  editingPassword,
  passwordForm,
  setPasswordForm,
  onToggleVisibility,
  onCopyToClipboard,
  onAddPassword,
  onEditPassword,
  onDeletePassword,
  onResetForm,
}: ClientPasswordsTabProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cofre de Senhas</h3>
            </div>
            <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
              setIsPasswordDialogOpen(open);
              if (!open) onResetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={onResetForm}>
                  <Plus className="h-3.5 w-3.5" />
                  Nova Senha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPassword ? 'Editar Senha' : 'Adicionar Senha'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={onAddPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Serviço *</Label>
                    <Input value={passwordForm.service_name} onChange={(e) => setPasswordForm({ ...passwordForm, service_name: e.target.value })} placeholder="Ex: Instagram, Facebook Ads..." required />
                  </div>
                  <div className="space-y-2">
                    <Label>Usuário/Email</Label>
                    <Input value={passwordForm.username} onChange={(e) => setPasswordForm({ ...passwordForm, username: e.target.value })} placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <Input type="password" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} placeholder="••••••••" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input value={passwordForm.notes} onChange={(e) => setPasswordForm({ ...passwordForm, notes: e.target.value })} placeholder="Notas adicionais..." />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => { setIsPasswordDialogOpen(false); onResetForm(); }}>Cancelar</Button>
                    <Button type="submit">{editingPassword ? 'Atualizar' : 'Salvar'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {passwords.length === 0 ? (
            <EmptyState icon={Lock} title="Nenhuma senha" description="Adicione senhas de serviços do cliente" />
          ) : (
            <div className="space-y-2">
              {passwords.map((pwd) => (
                <div key={pwd.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{pwd.service_name}</p>
                      {pwd.username && <p className="text-xs text-muted-foreground truncate">{pwd.username}</p>}
                      {pwd.notes && <p className="text-[11px] text-muted-foreground/70">{pwd.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-1 bg-background rounded-lg px-2.5 py-1">
                      <span className="text-xs font-mono">
                        {visiblePasswords.has(pwd.id) ? atob(pwd.encrypted_password) : '••••••••'}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleVisibility(pwd.id)}>
                      {visiblePasswords.has(pwd.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCopyToClipboard(atob(pwd.encrypted_password))}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditPassword(pwd)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onDeletePassword(pwd.id, pwd.service_name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
