import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import logo from '@/assets/logo.png';
import { api } from '@/lib/api/client';

export default function Auth() {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [activation, setActivation] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('activate'));
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  useEffect(() => {
    const syncActivation = () => setActivation(new URLSearchParams(window.location.hash.slice(1)).get('activate'));
    window.addEventListener('hashchange', syncActivation);
    return () => window.removeEventListener('hashchange', syncActivation);
  }, []);
  useEffect(() => { if (user && !activation) navigate('/', { replace: true }); }, [user, navigate, activation]);
  const login = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      if (activation) {
        if (password !== confirmation) { toast({ variant: 'destructive', title: 'As senhas não coincidem' }); return; }
        const { data, error } = await api.auth.activate({ token: activation, password });
        if (error) { toast({ variant: 'destructive', title: 'Não foi possível ativar o acesso', description: error.message }); return; }
        setEmail(data.email); setPassword(''); setConfirmation(''); setActivation(null);
        window.history.replaceState(null, '', '/auth');
        toast({ title: 'Senha definida. Entre na sua conta para continuar.' });
      } else {
        const { error } = await signIn(email.trim(), password); if (error) toast({ variant: 'destructive', title: 'Não foi possível entrar', description: error.message });
      }
    }
    finally { setBusy(false); }
  };
  return <div className="min-h-screen flex">
    <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12 text-center">
      <div><img src={logo} alt="EP Mídias" className="h-40 w-auto mx-auto mb-8" /><h1 className="text-4xl font-bold text-primary-foreground mb-4">Sistema de Gestão</h1><p className="text-primary-foreground/75 text-lg max-w-sm">Organize sua equipe, clientes e projetos em um só lugar.</p></div>
    </div>
    <main className="flex-1 flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8">
        <img src={logo} alt="EP Mídias" className="h-20 mx-auto lg:hidden" />
        <div><h2 className="text-2xl font-bold">{activation ? 'Defina sua senha de acesso' : 'Bem-vindo de volta'}</h2><p className="mt-2 text-muted-foreground">{activation ? 'Use pelo menos 12 caracteres. Este link só pode ser usado uma vez.' : 'Entre na sua conta para continuar.'}</p></div>
        <Card><CardContent className="p-6"><form onSubmit={login} className="space-y-5">
          {!activation && <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-10" id="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} /></div></div>}
          <div className="space-y-2"><Label htmlFor="password">{activation ? 'Nova senha' : 'Senha'}</Label><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-10" id="password" type="password" minLength={activation ? 12 : undefined} autoComplete={activation ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} required disabled={busy} /></div></div>
          {activation && <div className="space-y-2"><Label htmlFor="confirmation">Confirme a senha</Label><Input id="confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={busy} /></div>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{activation ? 'Definir senha' : 'Entrar'}<ArrowRight className="h-4 w-4 ml-2" /></>}</Button>
        </form></CardContent></Card>
        <p className="text-sm text-muted-foreground text-center">Para obter ou recuperar seu acesso, fale com o administrador da agência.</p>
      </div>
    </main>
  </div>;
}
