import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, UserCog, User } from 'lucide-react';

type AppRole = 'admin' | 'gerente' | 'colaborador';

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
          email: '', // We don't expose emails for security
        };
      });
      setMembers(membersWithRoles);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

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
      default: return User;
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'default';
      case 'gerente': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'gerente': return 'Gerente';
      default: return 'Colaborador';
    }
  };

  const groupedMembers = {
    admin: members.filter(m => m.role === 'admin'),
    gerente: members.filter(m => m.role === 'gerente'),
    colaborador: members.filter(m => m.role === 'colaborador'),
  };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os membros da sua agência
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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

                    <div className="flex items-center gap-4">
                      {isAdmin && member.user_id !== user?.id ? (
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
                            <SelectItem value="colaborador">Colaborador</SelectItem>
                          </SelectContent>
                        </Select>
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
