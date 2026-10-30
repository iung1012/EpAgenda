import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { secret, HttpError } from './config.ts';

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export function encryptCredential(value: string, id: string): string {
  const key = Buffer.from(secret('CREDENTIALS_KEY'), 'base64');
  if (key.length !== 32) throw new Error('CREDENTIALS_KEY deve conter 32 bytes em Base64');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(id));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}
export function decryptCredential(value: string, id: string): string {
  const [version, iv, tag, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !tag || ciphertext === undefined) throw new HttpError(500, 'Credencial ainda não migrada');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(secret('CREDENTIALS_KEY'), 'base64'), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}
export function signFile(bucket: string, path: string, seconds: number) {
  const payload = Buffer.from(JSON.stringify({ bucket, path, expires: Date.now() + Math.min(seconds, 3600) * 1000 })).toString('base64url');
  const signature = createHmac('sha256', secret('FILE_SIGNING_KEY')).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
export function verifyFile(token: string, bucket: string, path: string) {
  try {
    const [payload, signature] = token.split('.');
    const expected = createHmac('sha256', secret('FILE_SIGNING_KEY')).update(payload).digest();
    const given = Buffer.from(signature, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.bucket === bucket && data.path === path && Number.isFinite(data.expires) && data.expires > Date.now();
  } catch { return false; }
}
