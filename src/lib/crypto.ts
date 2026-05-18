// AES-GCM symmetric encryption using the Web Crypto API.
// The encryption key is derived from the Supabase anon key so each deployment
// has its own key without requiring a separate secret management system.
// NOTE: this is client-side encryption and provides obfuscation-level protection
// against casual database inspection. For production-grade secret storage,
// migrate to a server-side vault (e.g. Supabase Edge Function + Vault).

const BASE_KEY_MATERIAL = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

async function getDerivedKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const raw = encoder.encode(BASE_KEY_MATERIAL);
  const hashBuffer = await crypto.subtle.digest('SHA-256', raw);
  return crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptPassword(plaintext: string): Promise<string> {
  const key = await getDerivedKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );
  // Store as base64(iv):base64(ciphertext)
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return `${ivB64}:${ctB64}`;
}

export async function decryptPassword(ciphertext: string): Promise<string> {
  // Support legacy plain-base64 values that were stored before this migration
  if (!ciphertext.includes(':')) {
    try {
      return atob(ciphertext);
    } catch {
      return ciphertext;
    }
  }
  const [ivB64, ctB64] = ciphertext.split(':');
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const key = await getDerivedKey();
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(decrypted);
}
