import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { WhatsappSettings } from '@/components/settings/WhatsappSettings';
import { WhatsappMessageLogs } from '@/components/settings/WhatsappMessageLogs';

export default function Settings() {
  const { profile, user, isAdminOrManager } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileData.full_name,
        phone: profileData.phone,
      })
      .eq('user_id', user.id);
    setIsLoading(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar perfil', description: error.message });
    } else {
      toast({ title: 'Perfil atualizado com sucesso!' });
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ variant: 'destructive', title: 'As senhas não coincidem' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'A senha deve ter no mínimo 6 caracteres' });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });
    setIsLoading(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar senha', description: error.message });
    } else {
      toast({ title: 'Senha atualizada com sucesso!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  return (
    <div className="space-y-6 animate-in max-w-2xl">
      <PageHeader 
        title="Configurações" 
        description="Gerencie seu perfil e preferências"
      />

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>
            Atualize suas informações pessoais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Senha
          </CardTitle>
          <CardDescription>
            Altere sua senha de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Atualizando...' : 'Atualizar senha'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isAdminOrManager && <WhatsappSettings />}
      {isAdminOrManager && <WhatsappMessageLogs />}

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Sobre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Agency Hub</strong> - Sistema de Gestão para Agências</p>
            <p>Versão 1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
