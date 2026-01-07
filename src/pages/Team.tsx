import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, UserCog, User, Plus, Trash2, Video } from 'lucide-react';

type AppRole = 'admin' | 'gerente' | 'colaborador' | 'filmmaker';

interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  role: AppRole;
  email: string;
}

export default function Team() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'colaborador' as AppRole,
  });
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  const fetchTeamMembers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, phone')
      .order('full_name');

    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (profiles && roles) {
      const membersWithRoles = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: (userRole?.role || 'colaborador') as AppRole,
          email: '',
        };
      });
      setMembers(membersWithRoles);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

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

    setIsLoading(true);

    try {
      // Create user via Supabase Auth
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
        // Update role if not colaborador (default)
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
        
        // Wait a bit for the trigger to create profile
        setTimeout(() => {
          fetchTeamMembers();
        }, 1000);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar colaborador' });
    } finally {
      setIsLoading(false);
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
      fetchTeamMembers();
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Apenas administradores podem remover membros' });
      return;
    }

    if (userId === user?.id) {
      toast({ variant: 'destructive', title: 'Você não pode remover sua própria conta' });
      return;
    }

    const confirmed = window.confirm(`Tem certeza que deseja remover ${memberName}?`);
    if (!confirmed) return;

    // Delete profile (will cascade to user_roles due to FK constraints)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao remover membro', description: error.message });
    } else {
      toast({ title: 'Membro removido com sucesso!' });
      fetchTeamMembers();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'admin': return Shield;
      case 'gerente': return UserCog;
      case 'filmmaker': return Video;
      default: return User;
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'default';
      case 'gerente': return 'secondary';
      case 'filmmaker': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'gerente': return 'Gerente';
      case 'filmmaker': return 'Filmmaker';
      default: return 'Colaborador';
    }
  };

  const groupedMembers = {
    admin: members.filter(m => m.role === 'admin'),
    gerente: members.filter(m => m.role === 'gerente'),
    filmmaker: members.filter(m => m.role === 'filmmaker'),
    colaborador: members.filter(m => m.role === 'colaborador'),
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Equipe</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os membros da sua agência
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
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
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{groupedMembers.admin.length}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
                <UserCog className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{groupedMembers.gerente.length}</p>
                <p className="text-sm text-muted-foreground">Gerentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
                <Video className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{groupedMembers.filmmaker.length}</p>
                <p className="text-sm text-muted-foreground">Filmmakers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{groupedMembers.colaborador.length}</p>
                <p className="text-sm text-muted-foreground">Colaboradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Todos os Membros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum membro encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {members.map((member) => {
                const RoleIcon = getRoleIcon(member.role);
                return (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/30"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url ?? undefined} />
                        <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        {member.phone && (
                          <p className="text-sm text-muted-foreground">{member.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isAdmin && member.user_id !== user?.id ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(value: AppRole) => handleRoleChange(member.user_id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="gerente">Gerente</SelectItem>
                              <SelectItem value="filmmaker">Filmmaker</SelectItem>
                              <SelectItem value="colaborador">Colaborador</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveMember(member.user_id, member.full_name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1.5">
                          <RoleIcon className="h-3 w-3" />
                          {getRoleLabel(member.role)}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
