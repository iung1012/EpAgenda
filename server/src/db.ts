import { mkdirSync } from 'node:fs';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient, Prisma } from '../generated/prisma/client.ts';
import { config } from './config.ts';
import type { Row, TableName } from './schema.ts';

mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
export const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: config.databaseUrl }) });
export type Transaction = Prisma.TransactionClient;
export type Database = typeof db | Transaction;
export interface Model {
  findMany(args?: Record<string, unknown>): Promise<Row[]>;
  findFirst(args?: Record<string, unknown>): Promise<Row | null>;
  findUnique(args: Record<string, unknown>): Promise<Row | null>;
  count(args?: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<Row>;
  update(args: Record<string, unknown>): Promise<Row>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
  upsert(args: Record<string, unknown>): Promise<Row>;
  delete(args: Record<string, unknown>): Promise<Row>;
  deleteMany(args?: Record<string, unknown>): Promise<{ count: number }>;
}
export const model = (table: TableName, database: Database = db) => database[table] as unknown as Model;
export { Prisma };
