import 'dotenv/config';
import { resolve } from 'node:path';

export const config = {
  production: process.env.NODE_ENV === 'production',
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3102),
  origin: process.env.APP_ORIGIN || 'http://localhost:8080',
  dataDir: resolve(process.env.DATA_DIR || './data'),
  databaseUrl: process.env.DATABASE_URL || 'file:./data/epagenda.db',
};
export function secret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`Configure ${name} com pelo menos 32 caracteres`);
  return value;
}
export class HttpError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}
