import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MessageCircle, Plus, RefreshCw, Trash2, Unplug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WhatsappConfig {
  id: string;
  instance_name: string | null;
  status: string;
  phone_connected: string | null;
  notify_on_create: boolean;
  notify_on_update: boolean;
  notify_on_cancel: boolean;
  notify_on_reminder: boolean;
}

interface Recipient {
  id: string;
  label: string;
  phone: string;
  active: boolean;
}

function statusBadge(status: string) {
  if (status === 'connected') return <Badge className="bg-green-600 hover:bg-green-600">Conectado</Badge>;
  if (status === 'connecting') return <Badge variant="outline">Conectando…</Badge>;
  return <Badge variant="secondary">Desconectado</Badge>;
}

export function WhatsappSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<WhatsappConfig | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [instanceName, setInstanceName] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ label: '', phone: '' });

  const load = useCallback(async () => {
    const [{ data: cfg }, { data: rec }] = await Promise.all([
      supabase.from('whatsapp_config').select('*').eq('singleton', true).maybeSingle(),
      supabase.from('whatsapp_recipients').select('*').order('created_at'),
    ]);
    if (cfg) {
      setConfig(cfg as WhatsappConfig);
      if (cfg.instance_name) setInstanceName(cfg.instance_name);
    }
    if (rec) setRecipients(rec as Recipient[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll status while QR modal is open OR while connecting
  useEffect(() => {
    if (!qrOpen && config?.status === 'connected') return;
    if (!config?.instance_name) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.functions.invoke('whatsapp-status');
      if (data?.status) {
        setConfig((c) => (c ? { ...c, status: data.status } : c));
        if (data.status === 'connected') {
          setQrOpen(false);
          load();
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [qrOpen, config?.instance_name, config?.status, load]);

  const handleConnect = async () => {
    if (!instanceName.trim()) {
      toast({ variant: 'destructive', title: 'Informe um nome para a instância' });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
      body: { instanceName: instanceName.trim() },
    });
    setBusy(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao conectar', description: error.message });
      return;
    }
    setQr(data?.qrcode ?? null);
    setQrOpen(true);
    load();
  };

  const handleDisconnect = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke('whatsapp-disconnect');
    setBusy(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao desconectar', description: error.message });
      return;
    }
    toast({ title: 'WhatsApp desconectado' });
    load();
  };

  const updateFlag = async (field: keyof WhatsappConfig, value: boolean) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
    await supabase.from('whatsapp_config').update({ [field]: value }).eq('id', config.id);
  };

  const addRecipient = async () => {
    const phone = newRecipient.phone.replace(/\D/g, '');
    if (!newRecipient.label.trim() || phone.length < 10) {
      toast({ variant: 'destructive', title: 'Preencha um nome e telefone válido' });
      return;
    }
    const { error } = await supabase.from('whatsapp_recipients').insert({
      label: newRecipient.label.trim(),
      phone,
      active: true,
    });
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar', description: error.message });
      return;
    }
    setNewRecipient({ label: '', phone: '' });
    load();
  };

  const toggleRecipient = async (r: Recipient, active: boolean) => {
    setRecipients((prev) => prev.map((x) => (x.id === r.id ? { ...x, active } : x)));
    await supabase.from('whatsapp_recipients').update({ active }).eq('id', r.id);
  };

  const removeRecipient = async (r: Recipient) => {
    await supabase.from('whatsapp_recipients').delete().eq('id', r.id);
    load();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            WhatsApp (Evolution API)
          </CardTitle>
          <CardDescription>
            Conecte um número via QR Code para disparar alertas de visitas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Status</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {statusBadge(config?.status ?? 'disconnected')}
                {config?.phone_connected && <span>{config.phone_connected}</span>}
              </div>
            </div>
            {config?.status === 'connected' ? (
              <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={busy} className="gap-2">
                <Unplug className="h-4 w-4" /> Desconectar
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Nome da instância</Label>
            <div className="flex gap-2">
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="ex: ep-midias"
                disabled={config?.status === 'connected'}
              />
              <Button onClick={handleConnect} disabled={busy || config?.status === 'connected'} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {config?.instance_name ? 'Reconectar' : 'Conectar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Um QR Code será exibido para escanear no WhatsApp do aparelho.
            </p>
          </div>

          {config && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="text-sm font-medium">Quais eventos disparam mensagem</div>
              {([
                ['notify_on_create', 'Nova visita agendada'],
                ['notify_on_update', 'Visita editada'],
                ['notify_on_cancel', 'Visita cancelada / excluída'],
                ['notify_on_reminder', 'Lembrete 20 min antes'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-sm font-normal">{label}</Label>
                  <Switch
                    id={key}
                    checked={!!config[key as keyof WhatsappConfig]}
                    onCheckedChange={(v) => updateFlag(key as keyof WhatsappConfig, v)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destinatários</CardTitle>
          <CardDescription>
            Números que vão receber os alertas. Inclua DDI + DDD (ex: 5511999998888).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Nome (ex: Comercial)"
              value={newRecipient.label}
              onChange={(e) => setNewRecipient((r) => ({ ...r, label: e.target.value }))}
            />
            <Input
              placeholder="Telefone (55DDNNNNNNNNN)"
              value={newRecipient.phone}
              onChange={(e) => setNewRecipient((r) => ({ ...r, phone: e.target.value }))}
            />
            <Button onClick={addRecipient} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="divide-y rounded-lg border">
            {recipients.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">Nenhum destinatário cadastrado.</div>
            )}
            {recipients.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="text-sm font-medium">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.phone}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={r.active} onCheckedChange={(v) => toggleRecipient(r, v)} />
                  <Button variant="ghost" size="icon" onClick={() => removeRecipient(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho.
            </DialogDescription>
          </DialogHeader>
          {qr ? (
            <img
              src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
              alt="QR Code WhatsApp"
              className="mx-auto h-64 w-64 rounded-lg border bg-white p-2"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Aguardando QR Code…
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Assim que o pareamento for concluído, esta janela fecha sozinha.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}