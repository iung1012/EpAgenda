import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, addMonths, subMonths, isPast,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Instagram, CheckCircle2, Clock, AlertTriangle, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { PostFormDialog, PostFormValues } from '@/components/forms/PostFormDialog';
import { usePosts, Post } from '@/hooks/usePosts';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export default function Posts() {
  const { posts, refetch } = usePosts();
  const { clients } = useClients({ minimal: true });
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clientFilter, setClientFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dayDialog, setDayDialog] = useState<{ open: boolean; date: Date | null }>({ open: false, date: null });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: '', title: '' });

  const filteredPosts = useMemo(() => posts.filter(p => {
    if (clientFilter !== 'all' && p.client_id !== clientFilter) return false;
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false;
    return true;
  }), [posts, clientFilter, platformFilter]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    filteredPosts.forEach(p => {
      const key = format(new Date(p.scheduled_date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [filteredPosts]);

  const getEffectiveStatus = (p: Post): 'agendado' | 'postado' | 'atrasado' => {
    if (p.posted_at || p.status === 'postado') return 'postado';
    if (isPast(new Date(p.scheduled_date))) return 'atrasado';
    return 'agendado';
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'postado': return 'bg-emerald-500';
      case 'atrasado': return 'bg-destructive';
      default: return 'bg-amber-500';
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'postado': return <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" />Postado</Badge>;
      case 'atrasado': return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Atrasado</Badge>;
      default: return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Agendado</Badge>;
    }
  };

  const handleSubmit = async (data: PostFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        title: data.title,
        caption: data.caption || null,
        scheduled_date: new Date(data.scheduled_date).toISOString(),
        client_id: data.client_id || null,
        platform: data.platform,
        status: data.status,
        media_url: data.media_url || null,
        link: data.link || null,
        posted_at: data.status === 'postado' ? new Date().toISOString() : null,
      };
      if (editing) {
        const { error } = await supabase.from('posts').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Postagem atualizada!' });
      } else {
        const { error } = await supabase.from('posts').insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast({ title: 'Postagem criada!' });
      }
      setDialogOpen(false);
      setEditing(null);
      refetch();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsPosted = async (post: Post) => {
    const { error } = await supabase.from('posts').update({
      status: 'postado', posted_at: new Date().toISOString(),
    }).eq('id', post.id);
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
    else { toast({ title: 'Marcado como postado!' }); refetch(); }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from('posts').delete().eq('id', confirmDelete.id);
    if (error) toast({ variant: 'destructive', title: 'Erro', description: error.message });
    else { toast({ title: 'Postagem excluída' }); refetch(); }
    setConfirmDelete({ open: false, id: '', title: '' });
  };

  const getDefaultValues = (): Partial<PostFormValues> | undefined => {
    if (!editing) return undefined;
    return {
      title: editing.title,
      caption: editing.caption || '',
      scheduled_date: format(new Date(editing.scheduled_date), "yyyy-MM-dd'T'HH:mm"),
      client_id: editing.client_id || '',
      platform: editing.platform as any,
      status: editing.status,
      media_url: editing.media_url || '',
      link: editing.link || '',
    };
  };

  const dayPosts = dayDialog.date ? (postsByDay.get(format(dayDialog.date, 'yyyy-MM-dd')) || []) : [];

  return (
    <div className="space-y-6 animate-in">
      <PageHeader
        title="Postagens"
        description="Calendário de postagens dos clientes"
        action={
          <Button size="sm" className="gap-2" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Nova Postagem
          </Button>
        }
      />

      {/* Filters + nav */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize min-w-[180px] text-center">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoje</Button>
        </div>
        <div className="flex gap-2 ml-auto flex-wrap">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos clientes</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas plataformas</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Postado</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Agendado</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Atrasado</span>
      </div>

      {/* Calendar grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dayPostsList = postsByDay.get(key) || [];
            const inMonth = isSameMonth(day, currentMonth);
            const today = isSameDay(day, new Date());
            return (
              <button
                key={key}
                onClick={() => setDayDialog({ open: true, date: day })}
                className={cn(
                  "min-h-[90px] border-b border-r p-2 text-left hover:bg-muted/40 transition-colors",
                  !inMonth && "bg-muted/20 text-muted-foreground/50",
                )}
              >
                <div className={cn("text-xs font-medium mb-1", today && "h-5 w-5 inline-flex items-center justify-center bg-primary text-primary-foreground rounded-full")}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayPostsList.slice(0, 3).map(p => {
                    const eff = getEffectiveStatus(p);
                    return (
                      <div key={p.id} className="flex items-center gap-1 text-[10px] truncate">
                        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", statusColor(eff))} />
                        <span className="truncate">{p.title}</span>
                      </div>
                    );
                  })}
                  {dayPostsList.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">+{dayPostsList.length - 3} mais</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <PostFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        onSubmit={handleSubmit}
        defaultValues={getDefaultValues()}
        clients={clients}
        isEditing={!!editing}
        isLoading={isLoading}
      />

      <Dialog open={dayDialog.open} onOpenChange={(o) => setDayDialog({ open: o, date: o ? dayDialog.date : null })}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dayDialog.date && format(dayDialog.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dayPosts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Nenhuma postagem neste dia.
                <div className="mt-3">
                  <Button size="sm" onClick={() => {
                    setEditing(null);
                    setDialogOpen(true);
                    setDayDialog({ open: false, date: null });
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Criar postagem
                  </Button>
                </div>
              </div>
            ) : dayPosts.map(p => {
              const eff = getEffectiveStatus(p);
              const client = clients.find(c => c.id === p.client_id);
              return (
                <Card key={p.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{p.title}</h4>
                        {statusBadge(eff)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
                        <span className="capitalize flex items-center gap-1"><Instagram className="h-3 w-3" />{p.platform}</span>
                        {client && <span>• {client.name}</span>}
                        <span>• {format(new Date(p.scheduled_date), 'HH:mm')}</span>
                      </div>
                      {p.caption && <p className="text-xs mt-1 line-clamp-2">{p.caption}</p>}
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1">
                          <ExternalLink className="h-3 w-3" /> Ver post
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {eff !== 'postado' && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => markAsPosted(p)}>
                        <CheckCircle2 className="h-3 w-3" /> Marcar como postado
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => {
                      setEditing(p); setDialogOpen(true); setDayDialog({ open: false, date: null });
                    }}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive" onClick={() => setConfirmDelete({ open: true, id: p.id, title: p.title })}>
                      <Trash2 className="h-3 w-3" /> Excluir
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(o) => setConfirmDelete(p => ({ ...p, open: o }))}
        title="Excluir postagem"
        description={`Excluir "${confirmDelete.title}"?`}
        confirmText="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
