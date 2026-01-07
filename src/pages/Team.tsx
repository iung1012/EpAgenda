import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, UserCog, User, Plus, Video, Palette } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { StatsSkeleton } from '@/components/layout/CardSkeleton';
import { ErrorState } from '@/components/layout/ErrorState';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { useProfiles, AppRole } from '@/hooks/useProfiles';
import { TeamMemberCard } from '@/components/team/TeamMemberCard';
import { RoleSection } from '@/components/team/RoleSection';
import { Skeleton } from '@/components/ui/skeleton';

export default function Team() {
  const { profilesWithRoles: members, isLoading, error, refetch } = useProfiles({ withRoles: true });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    memberName: string;
  }>({ open: false, userId: '', memberName: '' });
  const [newMemberForm, setNewMemberForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'colaborador' as AppRole,
  });
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.email || !newMemberForm.password || !newMemberForm.full_name) {
      toast({ variant: 'destructive', title: 'Preencha todos os campos obrigatórios' });
      return;
    }

    if (newMemberForm.password.length < 6) {
      toast({ variant: 'destructive', title: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newMemberForm.email,
        password: newMemberForm.password,
        options: {
          data: { full_name: newMemberForm.full_name }
        }
      });

      if (authError) {
        toast({ variant: 'destructive', title: 'Erro ao criar usuário', description: authError.message });
        return;
      }

      if (authData.user) {
        if (newMemberForm.role !== 'colaborador') {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: newMemberForm.role })
            .eq('user_id', authData.user.id);

          if (roleError) {
            console.error('Error updating role:', roleError);
          }
        }

        toast({ title: 'Colaborador adicionado com sucesso!' });
        setIsAddDialogOpen(false);
        setNewMemberForm({ email: '', password: '', full_name: '', role: 'colaborador' });
        
        setTimeout(() => {
          refetch();
        }, 1000);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar colaborador' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Apenas administradores podem alterar cargos' });
      return;
    }

    if (userId === user?.id) {
      toast({ variant: 'destructive', title: 'Você não pode alterar seu próprio cargo' });
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar cargo', description: error.message });
    } else {
      toast({ title: 'Cargo atualizado com sucesso!' });
      refetch();
    }
  };

  const handleRemoveMember = async () => {
    const { userId } = confirmDialog;
    
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao remover membro', description: error.message });
    } else {
      toast({ title: 'Membro removido com sucesso!' });
      refetch();
    }
    
    setConfirmDialog({ open: false, userId: '', memberName: '' });
  };

  const openRemoveDialog = (userId: string, memberName: string) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Apenas administradores podem remover membros' });
      return;
    }

    if (userId === user?.id) {
      toast({ variant: 'destructive', title: 'Você não pode remover sua própria conta' });
      return;
    }

    setConfirmDialog({ open: true, userId, memberName });
  };

  const groupedMembers = {
    admin: members.filter(m => m.role === 'admin'),
    gerente: members.filter(m => m.role === 'gerente'),
    filmmaker: members.filter(m => m.role === 'filmmaker'),
    designer: members.filter(m => m.role === 'designer'),
    colaborador: members.filter(m => m.role === 'colaborador'),
  };

  const roleConfigs = [
    { key: 'admin', title: 'Administradores', icon: Shield, color: 'text-primary', bgColor: 'bg-primary/10' },
    { key: 'gerente', title: 'Gerentes', icon: UserCog, color: 'text-info', bgColor: 'bg-info/10' },
    { key: 'filmmaker', title: 'Filmmakers', icon: Video, color: 'text-warning', bgColor: 'bg-warning/10' },
    { key: 'designer', title: 'Designers', icon: Palette, color: 'text-success', bgColor: 'bg-success/10' },
    { key: 'colaborador', title: 'Colaboradores', icon: User, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  ] as const;

  if (error) {
    return (
      <div className="space-y-6 animate-in">
        <PageHeader title="Equipe" description="Gerencie os membros da sua agência" />
        <Card>
          <CardContent className="pt-6">
            <ErrorState onRetry={refetch} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <PageHeader 
        title="Equipe" 
        description="Gerencie os membros da sua agência"
        action={
          isAdmin ? (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Colaborador</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={newMemberForm.full_name}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, full_name: e.target.value })}
                      placeholder="Nome do colaborador"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newMemberForm.email}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                      placeholder="email@exemplo.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <Input
                      type="password"
                      value={newMemberForm.password}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Select
                      value={newMemberForm.role}
                      onValueChange={(value: AppRole) => setNewMemberForm({ ...newMemberForm, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="colaborador">Colaborador</SelectItem>
                        <SelectItem value="designer">Designer</SelectItem>
                        <SelectItem value="filmmaker">Filmmaker</SelectItem>
                        <SelectItem value="gerente">Gerente</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {/* Summary Stats */}
      {isLoading ? (
        <div className="flex items-center gap-4 flex-wrap">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          {roleConfigs.map(({ key, title, icon: Icon, color, bgColor }) => {
            const count = groupedMembers[key].length;
            if (count === 0) return null;
            return (
              <div 
                key={key}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border"
              >
                <div className={`p-1 rounded-md ${bgColor}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <span className="text-sm font-medium">{count}</span>
                <span className="text-sm text-muted-foreground">{title}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm font-semibold">{members.length} Total</span>
          </div>
        </div>
      )}

      {/* Members by Role */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-28 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Users}
              title="Nenhum membro encontrado"
              description="Adicione seu primeiro colaborador para começar"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {roleConfigs.map(({ key, title, icon, color, bgColor }) => (
            <RoleSection
              key={key}
              title={title}
              icon={icon}
              color={color}
              bgColor={bgColor}
              count={groupedMembers[key].length}
            >
              {groupedMembers[key].map((member) => (
                <TeamMemberCard
                  key={member.user_id}
                  member={member}
                  isAdmin={isAdmin}
                  isCurrentUser={member.user_id === user?.id}
                  onRoleChange={handleRoleChange}
                  onRemove={openRemoveDialog}
                />
              ))}
            </RoleSection>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title="Remover membro"
        description={`Tem certeza que deseja remover ${confirmDialog.memberName}? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        onConfirm={handleRemoveMember}
        variant="destructive"
      />
    </div>
  );
}
