import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogRow {
  id: string;
  event: string | null;
  phone: string;
  recipient_label: string | null;
  message: string;
  provider_status: string | null;
  provider_message_id: string | null;
  remote_jid: string | null;
  error: string | null;
  created_at: string;
}

function statusBadge(status: string | null, error: string | null) {
  const s = (status ?? '').toUpperCase();
  if (error || s === 'REJECTED' || s === 'ERROR') {
    return <Badge variant="destructive">{s || 'FAILED'}</Badge>;
  }
  if (s === 'DELIVERED' || s === 'READ' || s === 'SENT' || s === 'SERVER_ACK' || s === 'DELIVERY_ACK' || s === 'READ_RECEIPT') {
    return <Badge className="bg-green-600 hover:bg-green-600">{s}</Badge>;
  }
  if (s === 'PENDING') {
    return <Badge variant="outline">PENDING</Badge>;
  }
  return <Badge variant="secondary">{s || 'UNKNOWN'}</Badge>;
}

export function WhatsappMessageLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('whatsapp_message_logs' as never)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setLogs((data ?? []) as LogRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Status de mensagens</CardTitle>
          <CardDescription>
            Últimos 100 envios com o status retornado pela Evolution e o ID da mensagem.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="divide-y rounded-lg border">
          {logs.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              {loading ? 'Carregando…' : 'Nenhum envio registrado ainda.'}
            </div>
          )}
          {logs.map((l) => (
            <div key={l.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {l.recipient_label ?? l.phone}
                  </span>
                  <span className="text-xs text-muted-foreground">{l.phone}</span>
                  {l.event && (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {l.event}
                    </Badge>
                  )}
                </div>
                <div className="line-clamp-2 text-xs text-muted-foreground">
                  {l.message}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {l.provider_message_id && (
                    <span>
                      ID: <code className="rounded bg-muted px-1">{l.provider_message_id}</code>
                    </span>
                  )}
                  {l.remote_jid && <span>JID: {l.remote_jid}</span>}
                  {l.error && <span className="text-destructive">Erro: {l.error}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {statusBadge(l.provider_status, l.error)}
                <span className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}