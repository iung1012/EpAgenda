import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Settings2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface FixedClient {
  id: string;
  name: string;
  logo_url: string | null;
  is_fixed_posting: boolean;
}

interface DayPost {
  id: string;
  client_id: string | null;
}

export default function Posts() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [date, setDate] = useState(new Date());
  const [clients, setClients] = useState<FixedClient[]>([]);
  const [dayPosts, setDayPosts] = useState<DayPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, logo_url, is_fixed_posting')
      .order('name');
    setClients((data as any) || []);
  }, []);

  const fetchDayPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('id, client_id')
      .eq('status', 'postado')
      .gte('scheduled_date', startOfDay(date).toISOString())
      .lte('scheduled_date', endOfDay(date).toISOString());
    setDayPosts((data as any) || []);
  }, [date]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchClients(), fetchDayPosts()]).finally(() => setLoading(false));
  }, [fetchClients, fetchDayPosts]);

  const fixedClients = useMemo(() => clients.filter(c => c.is_fixed_posting), [clients]);
  const postedByClient = useMemo(() => {
    const set = new Set<string>();
    dayPosts.forEach(p => p.client_id && set.add(p.client_id));
    return set;
  }, [dayPosts]);

  const togglePosted = async (client: FixedClient) => {
    const isPosted = postedByClient.has(client.id);
    if (isPosted) {
      const existing = dayPosts.find(p => p.client_id === client.id);
      if (!existing) return;
      const { error } = await supabase.from('posts').delete().eq('id', existing.id);
      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
        return;
      }
      setDayPosts(prev => prev.filter(p => p.id !== existing.id));
    } else {
      const noonDate = new Date(date);
      noonDate.setHours(12, 0, 0, 0);
      const { data, error } = await supabase.from('posts').insert({
        title: `${client.name} - ${format(date, 'dd/MM/yyyy')}`,
        scheduled_date: noonDate.toISOString(),
        posted_at: new Date().toISOString(),
        status: 'postado',
        platform: 'instagram',
        client_id: client.id,
        created_by: user?.id,
      }).select('id, client_id').single();
      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
        return;
      }
      setDayPosts(prev => [...prev, data as DayPost]);
    }
  };

  const toggleFixed = async (client: FixedClient, value: boolean) => {
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, is_fixed_posting: value } : c));
    const { error } = await supabase.from('clients').update({ is_fixed_posting: value }).eq('id', client.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, is_fixed_posting: !value } : c));
    }
  };

  const postedCount = fixedClients.filter(c => postedByClient.has(c.id)).length;
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Postagens"
        description="Checklist diário de postagens dos clientes fixos"
        action={
          <Sheet open={manageOpen} onOpenChange={setManageOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" /> Gerenciar clientes fixos
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Clientes fixos diários</SheetTitle>
              </SheetHeader>
              <p className="text-sm text-muted-foreground mt-2">
                Ative os clientes que devem aparecer todos os dias no checklist de postagens.
              </p>
              <div className="mt-4 space-y-2">
                {clients.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8">
                        {c.logo_url ? <AvatarImage src={c.logo_url} /> : null}
                        <AvatarFallback className="text-xs">{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{c.name}</span>
                    </div>
                    <Switch
                      checked={c.is_fixed_posting}
                      onCheckedChange={(v) => toggleFixed(c, v)}
                    />
                  </div>
                ))}
                {clients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente cadastrado.</p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      {/* Date nav */}
      <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setDate(subDays(date, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[220px]">
            <div className="text-lg font-semibold capitalize">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </div>
            <div className="text-xs text-muted-foreground">
              {isToday ? 'Hoje' : format(date, 'yyyy')}
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => setDate(new Date())}>Hoje</Button>
          )}
        </div>
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          {postedCount} de {fixedClients.length} postado{fixedClients.length === 1 ? '' : 's'}
        </Badge>
      </Card>

      {/* Checklist */}
      {loading ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">Carregando...</Card>
      ) : fixedClients.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <div className="text-sm text-muted-foreground">
            Nenhum cliente fixo configurado.<br />
            Use <strong>Gerenciar clientes</strong> para adicionar.
          </div>
          <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" /> Gerenciar clientes
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fixedClients.map(c => {
            const posted = postedByClient.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => togglePosted(c)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-md",
                  posted
                    ? "bg-emerald-500/5 border-emerald-500/40"
                    : "bg-card hover:border-primary/50",
                )}
              >
                <Avatar className="h-12 w-12">
                  {c.logo_url ? <AvatarImage src={c.logo_url} /> : null}
                  <AvatarFallback>{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className={cn(
                    "text-xs",
                    posted ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                  )}>
                    {posted ? 'Postado ✓' : 'Aguardando postagem'}
                  </div>
                </div>
                {posted ? (
                  <CheckCircle2 className="h-7 w-7 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-7 w-7 text-muted-foreground/40 flex-shrink-0 group-hover:text-primary/60" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
