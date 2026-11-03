import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, CalendarDays, FileText, CheckCircle2, Circle, Settings2, Image as ImageIcon } from 'lucide-react';
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
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { usePosts, type Post } from '@/hooks/usePosts';
import { PostFormDialog, type PostFormValues } from '@/components/forms/PostFormDialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';

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
  const [dayError, setDayError] = useState<string | null>(null);
  const [dayPostsLoading, setDayPostsLoading] = useState(true);
  const dayRequest = useRef(0);
  const initialDay = useRef(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [closed, setClosed] = useState(false);
  const [checkingDay, setCheckingDay] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStart, setReportStart] = useState(format(startOfDay(new Date()),'yyyy-MM-dd'));
  const [reportEnd, setReportEnd] = useState(format(new Date(),'yyyy-MM-dd'));
  const [report, setReport] = useState<Post[] | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const { posts, isLoading: postsLoading, error: postsError, refetch: refetchPosts } = usePosts(date);
  useEffect(() => {
    let current=true; setCheckingDay(true); setClosed(false);
    void api.rpc<{closed:boolean}>('get_post_day',{date:format(date,'yyyy-MM-dd')}).then(({data,error})=>{
      if(!current)return;
      if(error){setClosed(true);toast({variant:'destructive',title:'Não foi possível verificar o dia',description:error.message});}
      else {
        if(initialDay.current && data?.closed){setDate(value=>addDays(value,1));return;}
        setClosed(!!data?.closed);
      }
      initialDay.current=false;
      setCheckingDay(false);
    });
    return ()=>{current=false;};
  },[date,toast]);
  const closeDay = async () => {
    setClosing(true);
    const {error}=await api.rpc('close_post_day',{date:format(date,'yyyy-MM-dd')});
    setClosing(false);setConfirmClose(false);
    if(error){toast({variant:'destructive',title:'Erro ao encerrar o dia',description:error.message});return;}
    toast({title:'Dia encerrado'});setDate(current=>addDays(current,1));
  };
  const loadReport = async () => {
    const from=new Date(`${reportStart}T00:00:00`),to=new Date(`${reportEnd}T23:59:59.999`);
    if(!reportStart||!reportEnd||Number.isNaN(from.getTime())||Number.isNaN(to.getTime())||from>to){toast({variant:'destructive',title:'Informe um período válido'});return;}
    setReportBusy(true);setReport(null);
    try {
      const all:Post[]=[];
      for(let offset=0;;offset+=1000){
        const {data,error}=await api.from('posts').select('*').eq('status','postado').gte('scheduled_date',from.toISOString()).lte('scheduled_date',to.toISOString()).order('scheduled_date',{ascending:true}).order('id',{ascending:true}).range(offset,offset+999);
        if(error)throw error;const rows=(data||[]) as Post[];all.push(...rows);if(rows.length<1000)break;
      }
      setReport(all);
    } catch(error){toast({variant:'destructive',title:'Erro ao gerar relatório',description:error instanceof Error?error.message:'Tente novamente'});}
    finally{setReportBusy(false);}
  };
  const selectedPosts = useMemo(() => posts.filter(post => {
    const scheduled = new Date(post.scheduled_date);
    if (scheduled < startOfDay(date) || scheduled > endOfDay(date)) return false;
    const client = clients.find(item => item.id === post.client_id);
    const isChecklistEntry = client && post.title === `${client.name} - ${format(date, 'dd/MM/yyyy')}`;
    return post.status === 'postado' || !isChecklistEntry;
  }), [posts, date, clients]);

  const createPost = async (values: PostFormValues) => {
    setSavingPost(true);
    try {
      const { error } = await api.from('posts').insert({
        ...values, scheduled_date: new Date(values.scheduled_date).toISOString(),
        client_id: values.client_id || null, caption: values.caption || null,
        link: values.link || null, media_url: values.media_url || null,
        posted_at: values.status === 'postado' ? new Date().toISOString() : null,
        created_by: user?.id,
      });
      if (error) throw error;
      setPostDialogOpen(false);
      await Promise.all([refetchPosts(), fetchDayPosts()]);
      toast({ title: 'Postagem cadastrada!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar postagem', description: error instanceof Error ? error.message : 'Tente novamente' });
    } finally { setSavingPost(false); }
  };

  const togglePost = async (post: Post) => {
    const posted = post.status !== 'postado';
    const { error } = await api.from('posts').update({ status: posted ? 'postado' : 'agendado', posted_at: posted ? new Date().toISOString() : null }).eq('id', post.id);
    if (error) toast({ variant: 'destructive', title: 'Erro ao atualizar postagem', description: error.message });
    else await Promise.all([refetchPosts(), fetchDayPosts()]);
  };

  const fetchClients = useCallback(async () => {
    const { data } = await api
      .from('clients')
      .select('id, name, logo_url, is_fixed_posting')
      .order('name');
    setClients(data || []);
  }, []);

  const fetchDayPosts = useCallback(async () => {
    const current=++dayRequest.current;setDayPostsLoading(true);
    const { data, error } = await api
      .from('posts')
      .select('id, client_id')
      .eq('status', 'postado')
      .gte('scheduled_date', startOfDay(date).toISOString())
      .lte('scheduled_date', endOfDay(date).toISOString());
    if(current!==dayRequest.current)return;
    setDayError(error?.message || null);setDayPostsLoading(false);
    setDayPosts(data || []);
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
      const checklistPost = posts.find(post => post.client_id === client.id && post.status === 'postado' && post.title === `${client.name} - ${format(date, 'dd/MM/yyyy')}` && new Date(post.scheduled_date) >= startOfDay(date) && new Date(post.scheduled_date) <= endOfDay(date));
      const existing = dayPosts.find(p => p.id === checklistPost?.id) || dayPosts.find(p => p.client_id === client.id);
      if (!existing) return;
      const { error } = await api.from('posts').update({ status: 'agendado', posted_at: null }).eq('id', existing.id);
      if (error) {
        toast({ variant: 'destructive', title: 'Erro', description: error.message });
        return;
      }
      setDayPosts(prev => prev.filter(p => p.id !== existing.id));
      await Promise.all([refetchPosts(), fetchDayPosts()]);
    } else {
      const pending = posts.find(post => post.client_id === client.id && post.status === 'agendado' && post.title === `${client.name} - ${format(date, 'dd/MM/yyyy')}` && new Date(post.scheduled_date) >= startOfDay(date) && new Date(post.scheduled_date) <= endOfDay(date));
      if (pending) {
        const { error } = await api.from('posts').update({ status: 'postado', posted_at: new Date().toISOString() }).eq('id', pending.id);
        if (error) { toast({ variant: 'destructive', title: 'Erro', description: error.message }); return; }
        await Promise.all([refetchPosts(), fetchDayPosts()]);
        return;
      }
      const noonDate = new Date(date);
      noonDate.setHours(12, 0, 0, 0);
      const { data, error } = await api.from('posts').insert({
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
      await Promise.all([refetchPosts(), fetchDayPosts()]);
    }
  };

  const toggleFixed = async (client: FixedClient, value: boolean) => {
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, is_fixed_posting: value } : c));
    const { error } = await api.from('clients').update({ is_fixed_posting: value }).eq('id', client.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, is_fixed_posting: !value } : c));
    }
  };

  const setAllFixed = async (value: boolean) => {
    const targets = clients.filter(c => c.is_fixed_posting !== value);
    if (targets.length === 0) return;
    const snapshot = clients;
    setClients(cs => cs.map(c => ({ ...c, is_fixed_posting: value })));
    const { error } = await api
      .from('clients')
      .update({ is_fixed_posting: value })
      .in('id', targets.map(c => c.id));
    if (error) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      setClients(snapshot);
    } else {
      toast({ title: value ? 'Todos os clientes marcados como fixos' : 'Todos os clientes desmarcados' });
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
              {clients.length > 0 && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => setAllFixed(true)}>
                    Marcar todos
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setAllFixed(false)}>
                    Desmarcar todos
                  </Button>
                </div>
              )}
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
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}><PopoverTrigger asChild><Button variant="outline" size="icon" aria-label="Escolher data"><CalendarDays className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={selected=>{if(selected){initialDay.current=false;setDate(selected);setCalendarOpen(false);}}} locale={ptBR} captionLayout="dropdown-buttons" fromYear={2020} toYear={2100} /></PopoverContent></Popover>
          <div className="text-center min-w-[220px]">
            <div className="text-lg font-semibold capitalize">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </div>
            <div className="text-xs text-muted-foreground">
              {isToday ? 'Hoje' : format(date, 'yyyy')}
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => {initialDay.current=false;setDate(addDays(date, 1));}}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => {initialDay.current=false;setDate(new Date());}}>Hoje</Button>
          )}
        </div>
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          {postedCount} de {fixedClients.length} postado{fixedClients.length === 1 ? '' : 's'}
        </Badge>
        <div className="flex gap-2"><Button variant="outline" onClick={()=>setReportOpen(value=>!value)}><FileText className="h-4 w-4 mr-2" />Relatório</Button><Button disabled={checkingDay||closing||loading||dayPostsLoading||postsLoading||!!postsError||!!dayError} onClick={()=>closed?setDate(current=>addDays(current,1)):setConfirmClose(true)}>{closed?'Próximo dia':'OK — encerrar dia'}</Button></div>
      </Card>

      {closed && <p role="status" className="text-sm text-muted-foreground">Dia encerrado. As postagens estão disponíveis para consulta.</p>}
      {postsError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar as postagens: {postsError}</p>}
      {dayError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar o checklist: {dayError}</p>}
      <ConfirmDialog open={confirmClose} onOpenChange={setConfirmClose} title="Encerrar este dia?" description={`Após encerrar ${format(date,'dd/MM/yyyy')}, as postagens desse dia não poderão ser alteradas. ${fixedClients.length-postedCount} cliente(s) ainda aguardam postagem.`} confirmText="Encerrar e avançar" isLoading={closing} onConfirm={()=>void closeDay()} />
      {reportOpen && <Card className="p-4 space-y-3"><h2 className="font-semibold">Relatório de postagens</h2><div className="flex flex-wrap items-end gap-3"><label className="text-sm">De<Input type="date" value={reportStart} onChange={event=>setReportStart(event.target.value)} /></label><label className="text-sm">Até<Input type="date" value={reportEnd} onChange={event=>setReportEnd(event.target.value)} /></label><Button onClick={()=>void loadReport()} disabled={reportBusy}>{reportBusy?'Gerando...':'Gerar relatório'}</Button></div>{report && <div className="space-y-2"><p className="text-sm">{report.length} publicação(ões) postada(s) no período.</p>{report.map(post=><div key={post.id} className="border rounded-lg p-3 text-sm"><strong>{post.title}</strong><p className="text-muted-foreground">{clients.find(client=>client.id===post.client_id)?.name||'Sem cliente'} · {post.platform} · {format(new Date(post.scheduled_date),'dd/MM/yyyy HH:mm')}{post.posted_at?` · Marcada em ${format(new Date(post.posted_at),'dd/MM/yyyy HH:mm')}`:''}</p></div>)}</div>}</Card>}

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-semibold">Publicações do dia</h2><p className="text-sm text-muted-foreground">Acompanhe as publicações agendadas e postadas.</p></div>
          <Button size="sm" disabled={closed||checkingDay||dayPostsLoading||postsLoading||!!postsError||!!dayError} onClick={() => setPostDialogOpen(true)}>Adicionar postagem</Button>
        </div>
        {selectedPosts.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma publicação cadastrada para esta data.</p>}
        {(['agendadas', 'postadas'] as const).map(group => {
          const items = selectedPosts.filter(post => group === 'postadas' ? post.status === 'postado' : post.status !== 'postado');
          if (!items.length) return null;
          return <div key={group} className="space-y-2"><h3 className="text-sm font-semibold">{group === 'postadas' ? 'Postadas' : 'Agendadas'}</h3>{items.map(post => (
          <div key={post.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
            <div className="min-w-0"><p className="font-medium break-words">{post.title}</p><p className="text-sm text-muted-foreground">{clients.find(client => client.id === post.client_id)?.name || 'Sem cliente'} · {post.platform} · {format(new Date(post.scheduled_date), 'HH:mm')}</p></div>
            <Button disabled={closed||checkingDay||dayPostsLoading||postsLoading||!!postsError||!!dayError} variant={post.status === 'postado' ? 'secondary' : 'outline'} size="sm" onClick={() => void togglePost(post)}>{post.status === 'postado' ? 'Desmarcar' : 'Marcar como postado'}</Button>
          </div>
        ))}</div>;
        })}
      </Card>
      <PostFormDialog open={postDialogOpen} onOpenChange={setPostDialogOpen} onSubmit={createPost} clients={clients} isLoading={savingPost} />

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
                disabled={closed||checkingDay||dayPostsLoading||postsLoading||!!postsError||!!dayError}
                onClick={() => togglePosted(c)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70",
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
