import { useState } from 'react';
import { Download, Upload, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { AppBackup, decryptBackup, downloadBackup, encryptBackup, includeFiles } from '@/lib/backup';

export function BackupSettings() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<AppBackup | null>(null);
  const call = async (body: unknown) => {
    const { data, error } = await supabase.functions.invoke('application-backup', {body});
    if (error) {
      let detail = 'Não foi possível concluir. Confira sua conexão e tente novamente';
      if (error.context instanceof Response) {
        const parsed = await error.context.json().catch(() => null);
        if (parsed?.error) detail = parsed.error;
      }
      throw new Error(detail);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  };
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setFailed(false); setMessage('Processando…');
    try { await operation(); } catch (e) { setFailed(true); setMessage(e instanceof Error ? e.message : 'Não foi possível concluir'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5 border-t pt-6" aria-labelledby="backup-heading">
    <h2 id="backup-heading" className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="h-5 w-5" />Cópia de segurança</h2>
    <p className="text-sm text-muted-foreground">Inclui clientes, senhas dos clientes, agenda, visitas, tarefas, pautas, postagens, perfis, histórico do WhatsApp e arquivos enviados ao sistema.</p>
    <p className="text-sm text-muted-foreground">Não inclui senhas de login, chaves das integrações, arquivos externos do Drive/Canva nem cópias antigas do banco. No destino, crie as contas com os mesmos e-mails e configure novamente as integrações. As permissões atuais do destino serão preservadas.</p>
    <div className="space-y-2"><Label htmlFor="backup-password">Senha da cópia</Label><Input id="backup-password" type="password" autoComplete="new-password" value={password} disabled={busy} onChange={e => {setPassword(e.target.value); setReady(null);}} minLength={12} /></div>
    <div className="space-y-2"><Label htmlFor="backup-confirmation">Confirmar senha para exportar</Label><Input id="backup-confirmation" type="password" autoComplete="new-password" value={confirmation} disabled={busy} onChange={e => setConfirmation(e.target.value)} /></div>
    <p className="text-xs text-muted-foreground">Use pelo menos 12 caracteres. Guarde a senha: não é possível recuperar a cópia sem ela. Limite: 40 MB de arquivos enviados.</p>
    <div className="flex flex-wrap gap-3">
      <Button disabled={busy || password.length < 12 || password !== confirmation} onClick={() => run(async () => {
        setReady(null); const manifest = await call({action: 'export'});
        const backup = await includeFiles(manifest, setMessage);
        setMessage('Protegendo a cópia…'); setReady(await encryptBackup(backup, password));
        setMessage('Cópia pronta para baixar');
      })}><Download className="mr-2 h-4 w-4" />Exportar informações</Button>
      {ready && <Button variant="outline" onClick={() => downloadBackup(ready, `ep-midias-${new Date().toISOString().slice(0,10)}.epbackup`)}><Download className="mr-2 h-4 w-4" />Baixar cópia protegida</Button>}
    </div>
    <div className="space-y-2"><Label htmlFor="backup-file">Arquivo para importar</Label><Input id="backup-file" type="file" accept=".epbackup,application/json" disabled={busy} onChange={e => {setFile(e.target.files?.[0] || null); setPreview(null);}} /></div>
    <Button variant="outline" disabled={busy || !file || !password} onClick={() => run(async () => {
      if (!file) return; const backup = await decryptBackup(file, password); setPreview(backup); setMessage('Confira a cópia antes de importar');
    })}><Upload className="mr-2 h-4 w-4" />Importar informações</Button>
    {message && <p role="status" className={`flex items-center gap-2 text-sm ${failed ? 'text-destructive' : 'text-muted-foreground'}`}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{message}</p>}
    <AlertDialog open={!!preview} onOpenChange={open => {if (!open && !busy) setPreview(null);}}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar importação</AlertDialogTitle><AlertDialogDescription>
        Cópia de {preview ? new Date(preview.createdAt).toLocaleString('pt-BR') : ''}, com {preview ? Object.values(preview.tables).reduce((n,rows) => n + rows.length, 0) : 0} registros e {preview?.files.length || 0} arquivos. Registros com o mesmo ID serão atualizados; os demais serão adicionados. Nada será apagado. Permissões da equipe não serão alteradas. Faça uma cópia do destino antes de continuar.
      </AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><Button disabled={busy} onClick={() => run(async () => {
        if (!preview) return; const result = await call({action: 'import', backup: preview});
        setPreview(null); setMessage(`Importação concluída: ${result.records} registros e ${result.files} arquivos. Atualize a página para conferir.`); setPassword(''); setConfirmation('');
      })}>{busy ? 'Importando…' : 'Confirmar importação'}</Button></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </section>;
}