import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const tables = ['profiles','user_roles','clients','equipment','pautas','filmmaker_visits','tasks','calendar_events','filmmaker_demands','posts','client_drive_folders','client_folders','client_passwords','task_comments','task_templates','visit_equipment','notifications','whatsapp_config','whatsapp_recipients','whatsapp_message_logs','whatsapp_ai_messages'];
const rowSchema = z.record(z.unknown());
const backupSchema = z.object({
  format: z.literal('ep-midias-backup'), version: z.literal(1), createdAt: z.string(),
  sourceUrl: z.string().url(), tables: z.record(z.array(rowSchema)),
  users: z.array(z.object({ id: z.string().uuid(), email: z.string().email() })),
  files: z.array(z.object({ path: z.string().min(1).max(1024), type: z.string(), data: z.string() })),
});
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Método não permitido' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ error: 'Serviço indisponível' }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return reply({ error: 'Entre novamente no sistema' }, 401);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return reply({ error: 'Entre novamente no sistema' }, 401);
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', auth.user.id).eq('role', 'admin').maybeSingle();
  if (!role) return reply({ error: 'Somente administradores podem acessar as cópias' }, 403);
  const uploaded: string[] = [];
  try {
    const body = await req.json();
    const users: {id: string; email: string}[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error('Não foi possível conferir as contas da equipe');
      for (const user of data.users) if (user.email) users.push({ id: user.id, email: user.email });
      if (data.users.length < 1000) break;
    }
    if (body.action === 'export') {
      const { data, error } = await admin.rpc('export_application_backup');
      if (error) throw new Error('Não foi possível exportar todas as informações');
      const files: {path: string; url: string}[] = [];
      const walk = async (prefix: string) => {
        for (let offset = 0; ; offset += 100) {
          const { data: items, error: listError } = await admin.storage.from('client-files').list(prefix, { limit: 100, offset, sortBy: {column: 'name', order: 'asc'} });
          if (listError) throw new Error('Não foi possível listar todos os arquivos');
          for (const item of items || []) {
            const path = prefix ? `${prefix}/${item.name}` : item.name;
            if (!item.id) await walk(path);
            else {
              const { data: signed, error: signError } = await admin.storage.from('client-files').createSignedUrl(path, 3600);
              if (signError || !signed) throw new Error('Não foi possível incluir um arquivo');
              files.push({ path, url: signed.signedUrl });
            }
          }
          if ((items || []).length < 100) break;
        }
      };
      await walk('');
      return reply({ format: 'ep-midias-backup', version: 1, createdAt: new Date().toISOString(), sourceUrl: url, tables: data, users, files });
    }
    if (body.action !== 'import') return reply({ error: 'Ação inválida' }, 400);
    const parsed = backupSchema.safeParse(body.backup);
    if (!parsed.success) return reply({ error: 'Arquivo de cópia inválido ou incompatível' }, 400);
    const backup = parsed.data;
    if (Object.keys(backup.tables).length !== tables.length || tables.some(t => !Array.isArray(backup.tables[t]))) return reply({ error: 'A cópia está incompleta' }, 400);
    const mapping = new Map<string,string>();
    for (const old of backup.users) {
      const current = users.find(u => u.email.toLowerCase() === old.email.toLowerCase());
      if (!current) return reply({ error: 'Crie no destino todas as contas da equipe com os mesmos e-mails antes de importar' }, 409);
      mapping.set(old.id, current.id);
    }
    const userFields = ['user_id','assigned_to','created_by','filmmaker_id','target_user_id'];
    const rewrite = (value: unknown): unknown => {
      if (typeof value === 'string') return value.replaceAll(`${backup.sourceUrl}/storage/v1/`, `${url}/storage/v1/`);
      if (Array.isArray(value)) return value.map(rewrite);
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, rewrite(v)]));
      return value;
    };
    const restored = rewrite(backup.tables) as Record<string,Record<string,unknown>[]>;
    for (const rows of Object.values(restored)) for (const row of rows) {
      for (const field of userFields) if (typeof row[field] === 'string') {
        const mapped = mapping.get(row[field] as string);
        if (!mapped) return reply({ error: 'A cópia contém vínculo com uma conta ausente; restauração cancelada' }, 409);
        row[field] = mapped;
      }
      if (Array.isArray(row.read_by)) row.read_by = row.read_by.map(id => typeof id === 'string' ? mapping.get(id) || id : id);
    }
    // Destination account IDs and privileges must never be overwritten by a backup.
    const { data: profiles, error: profileError } = await admin.from('profiles').select('id,user_id');
    if (profileError) throw new Error('Não foi possível conferir os perfis');
    for (const profile of restored.profiles) {
      const existing = profiles?.find(p => p.user_id === profile.user_id);
      if (existing) profile.id = existing.id;
    }
    restored.user_roles = [];
    const { data: config } = await admin.from('whatsapp_config').select('id').maybeSingle();
    if (config) for (const row of restored.whatsapp_config) row.id = config.id;
    if (backup.sourceUrl !== url) for (const row of restored.whatsapp_config) { row.status = 'disconnected'; row.instance_name = null; row.phone_connected = null; }
    if (backup.files.reduce((n,f) => n + f.data.length, 0) > 55_000_000) return reply({ error: 'Esta cópia excede o limite de 40 MB de arquivos' }, 413);
    const paths = new Set<string>();
    for (const file of backup.files) {
      if (paths.has(file.path) || file.path.startsWith('/') || file.path.split('/').some(p => p === '..' || !p)) return reply({ error: 'Caminho de arquivo inválido' }, 400);
      paths.add(file.path);
      const bytes = Uint8Array.from(atob(file.data), c => c.charCodeAt(0));
      const { error } = await admin.storage.from('client-files').upload(file.path, bytes, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (error) {
        // Existing files must match exactly; do not silently replace or skip different content.
        const { data: existing, error: downloadError } = await admin.storage.from('client-files').download(file.path);
        if (downloadError || !existing) throw new Error('Não foi possível restaurar um arquivo');
        const current = new Uint8Array(await existing.arrayBuffer());
        if (current.length !== bytes.length || current.some((v,i) => v !== bytes[i])) throw new Error('Um arquivo existente tem conteúdo diferente; importação cancelada');
      } else uploaded.push(file.path);
    }
    const { data: result, error } = await admin.rpc('import_application_backup', { payload: restored });
    if (error) throw new Error('Dados incompatíveis com este banco. Nenhuma informação do banco foi importada');
    return reply({ ...result, files: backup.files.length });
  } catch (error) {
    if (uploaded.length) await admin.storage.from('client-files').remove(uploaded);
    return reply({ error: error instanceof Error ? error.message : 'Não foi possível concluir a operação' }, 400);
  }
});