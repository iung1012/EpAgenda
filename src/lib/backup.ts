export interface AppBackup {
  format: 'ep-midias-backup'; version: 1; createdAt: string; sourceUrl: string;
  tables: Record<string, Record<string, unknown>[]>;
  users: { id: string; email: string }[];
  files: { path: string; type: string; data: string }[];
}

const encode = (bytes: Uint8Array) => {
  let text = '';
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
};
const decode = (text: string) => Uint8Array.from(atob(text), c => c.charCodeAt(0));
async function key(password: string, salt: Uint8Array, usage: KeyUsage[]) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 310000, hash: 'SHA-256' }, material, {name: 'AES-GCM', length: 256}, false, usage);
}
export async function encryptBackup(backup: AppBackup, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await key(password, salt, ['encrypt']), new TextEncoder().encode(JSON.stringify(backup)));
  return new Blob([JSON.stringify({format: 'ep-midias-encrypted', version: 1, salt: encode(salt), iv: encode(iv), data: encode(new Uint8Array(encrypted))})], {type: 'application/json'});
}
export async function decryptBackup(file: File, password: string): Promise<AppBackup> {
  if (file.size > 85_000_000) throw new Error('O arquivo excede o limite de 85 MB');
  try {
    const envelope = JSON.parse(await file.text());
    if (envelope.format !== 'ep-midias-encrypted' || envelope.version !== 1) throw new Error();
    const salt = decode(envelope.salt); const iv = decode(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error();
    const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: iv as BufferSource}, await key(password, salt, ['decrypt']), decode(envelope.data) as BufferSource);
    const backup = JSON.parse(new TextDecoder().decode(plain));
    if (backup.format !== 'ep-midias-backup' || backup.version !== 1 || !backup.tables || !Array.isArray(backup.files) || !Array.isArray(backup.users)) throw new Error();
    return backup;
  } catch { throw new Error('Senha incorreta ou arquivo inválido'); }
}
export async function includeFiles(manifest: Omit<AppBackup, 'files'> & {files: {path: string; url: string}[]}, progress: (text: string) => void): Promise<AppBackup> {
  const files: AppBackup['files'] = []; let total = 0;
  for (const [i, file] of manifest.files.entries()) {
    progress(`Incluindo arquivos: ${i + 1}/${manifest.files.length}`);
    const response = await fetch(file.url);
    if (!response.ok) throw new Error('Não foi possível baixar todos os arquivos; cópia cancelada');
    const blob = await response.blob(); total += blob.size;
    if (total > 40_000_000) throw new Error('Os arquivos excedem 40 MB; a cópia não foi gerada para evitar uma exportação incompleta');
    files.push({path: file.path, type: blob.type, data: encode(new Uint8Array(await blob.arrayBuffer()))});
  }
  return {...manifest, files};
}
export function downloadBackup(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}