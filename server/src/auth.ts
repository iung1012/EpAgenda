import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from './db.ts';
import { config, HttpError } from './config.ts';
import { hashToken } from './crypto.ts';

export type Role = 'admin' | 'gerente' | 'colaborador' | 'filmmaker' | 'designer';
export interface Actor { id: string; email: string; role: Role }
export const isManager = (actor: Actor) => actor.role === 'admin' || actor.role === 'gerente';
const roles = ['admin', 'gerente', 'filmmaker', 'designer', 'colaborador'] as const;
export async function actorForUser(id: string): Promise<Actor | null> {
  const user = await db.auth_users.findUnique({ where: { id }, include: { user_roles_user_id: true, profiles_user_id: true } });
  if (!user || user.disabled || !user.confirmed || !user.profiles_user_id.length) return null;
  const role = roles.find(role => user.user_roles_user_id.some(row => row.role === role));
  return role ? { id, email: user.email, role } : null;
}
export async function authenticate(req: FastifyRequest): Promise<Actor | null> {
  const token = req.cookies.epagenda_session;
  if (!token) return null;
  const session = await db.auth_sessions.findUnique({ where: { token_hash: hashToken(token) } });
  if (!session || session.expires_at.getTime() <= Date.now()) return null;
  return actorForUser(session.user_id);
}
export async function requireActor(req: FastifyRequest): Promise<Actor> {
  const actor = await authenticate(req);
  if (!actor) throw new HttpError(401, 'Entre novamente no sistema');
  return actor;
}
export function requireManager(actor: Actor) { if (!isManager(actor)) throw new HttpError(403, 'Acesso restrito à administração'); }
export function requireAdmin(actor: Actor) { if (actor.role !== 'admin') throw new HttpError(403, 'Acesso restrito ao administrador'); }
export async function createUser(input: { email: string; password: string; full_name: string; role: Role }, actor?: Actor) {
  const id = randomUUID(), now = new Date().toISOString();
  const password_hash = await bcrypt.hash(input.password, 12);
  await db.$transaction(async tx => {
    if (actor && !await tx.auth_users.findFirst({where:{id:actor.id,disabled:false,user_roles_user_id:{some:{role:'admin'}}}})) throw new HttpError(403,'Acesso restrito ao administrador');
    await tx.auth_users.create({ data: { id, email: input.email.toLowerCase().trim(), password_hash, created_at: now, updated_at: now } });
    await tx.profiles.create({ data: { user_id: id, full_name: input.full_name.trim(), created_at: now, updated_at: now } });
    await tx.user_roles.create({ data: { user_id: id, role: input.role } });
  });
  return { id, email: input.email.toLowerCase().trim() };
}
const newPassword = z.string().min(12).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Use até 72 bytes na senha');
export const createUserSchema = z.object({ email: z.string().email(), password: newPassword, full_name: z.string().trim().min(2).max(150), role: z.enum(roles).default('colaborador') });
export async function registerAuth(app: FastifyInstance) {
  app.post('/api/auth/activate', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async req => {
    const { token, password } = z.object({ token: z.string().min(32).max(100), password: newPassword }).parse(req.body);
    const token_hash = hashToken(token);
    const record = await db.auth_activation_tokens.findUnique({ where: { token_hash } });
    if (!record || record.expires_at.getTime() <= Date.now()) throw new HttpError(401, 'Link inválido ou expirado. Solicite um novo ao administrador');
    const password_hash = await bcrypt.hash(password, 12);
    return db.$transaction(async tx => {
      const current = await tx.auth_activation_tokens.findUnique({ where: { token_hash } });
      if (!current || current.expires_at.getTime() <= Date.now()) throw new HttpError(401, 'Link inválido ou expirado');
      if ((await tx.auth_users.findUnique({where:{id:current.user_id}}))?.disabled) throw new HttpError(401, 'Acesso desativado');
      const user = await tx.auth_users.update({ where: { id: current.user_id }, data: { password_hash, confirmed: true, updated_at: new Date().toISOString() } });
      await tx.auth_activation_tokens.deleteMany({ where: { user_id: user.id } });
      await tx.auth_sessions.deleteMany({ where: { user_id: user.id } });
      return { email: user.email };
    });
  });
  app.post('/api/auth/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const { email, password } = z.object({ email: z.string().email(), password: z.string().min(1).max(256) }).parse(req.body);
    const user = await db.auth_users.findUnique({ where: { email: email.trim().toLowerCase() } });
    // Constant-cost comparison for unknown accounts prevents email enumeration.
    const valid = await bcrypt.compare(password, user?.password_hash || '$2b$12$M5VJO1lfOPikjZ5AKZ2Ire3Q1KIkfP.ehyqSe1I.5PFgoHy2nFJbK');
    const actor = user ? await actorForUser(user.id) : null;
    if (!user?.password_hash || !valid || !actor || Buffer.byteLength(password, 'utf8') > 72) throw new HttpError(401, 'Email ou senha incorretos');
    const token = randomBytes(32).toString('base64url');
    if (req.cookies.epagenda_session) await db.auth_sessions.deleteMany({ where: { token_hash: hashToken(req.cookies.epagenda_session) } });
    await db.auth_sessions.create({ data: { token_hash: hashToken(token), user_id: actor.id, expires_at: new Date(Date.now() + 7 * 86400_000) } });
    reply.setCookie('epagenda_session', token, { path: '/', httpOnly: true, secure: config.production, sameSite: 'lax', maxAge: 7 * 86400 });
    return { user: { id: actor.id, email: actor.email }, role: actor.role };
  });
  app.get('/api/auth/session', async req => {
    const actor = await authenticate(req);
    return { user: actor ? { id: actor.id, email: actor.email } : null, role: actor?.role || null };
  });
  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies.epagenda_session;
    if (token) await db.auth_sessions.deleteMany({ where: { token_hash: hashToken(token) } });
    reply.clearCookie('epagenda_session', { path: '/' });
    return { ok: true };
  });
  app.post('/api/auth/password', async req => {
    const actor = await requireActor(req);
    const body = z.object({ password: newPassword }).parse(req.body);
    await db.$transaction([
      db.auth_users.update({ where: { id: actor.id }, data: { password_hash: await bcrypt.hash(body.password, 12), updated_at: new Date().toISOString() } }),
      db.auth_sessions.deleteMany({ where: { user_id: actor.id, token_hash: { not: hashToken(req.cookies.epagenda_session!) } } }),
    ]);
    return { user: { id: actor.id, email: actor.email } };
  });
  app.post('/api/functions/create-user', async req => {
    const actor = await requireActor(req); requireAdmin(actor);
    return { user: await createUser(createUserSchema.parse(req.body), actor) };
  });
  app.post('/api/functions/deactivate-user', async req => {
    const actor = await requireActor(req); requireAdmin(actor);
    const { user_id } = z.object({ user_id: z.string().uuid() }).parse(req.body);
    if (user_id === actor.id) throw new HttpError(400, 'Você não pode desativar sua própria conta');
    await db.$transaction(async tx => {
      const currentAdmin = await tx.auth_users.findFirst({ where: { id: actor.id, disabled: false, user_roles_user_id: { some: { role: 'admin' } } } });
      if (!currentAdmin) throw new HttpError(403, 'Acesso restrito ao administrador');
      const target = await tx.user_roles.findFirst({ where: { user_id, role: 'admin' } });
      if (target && await tx.auth_users.count({ where: { disabled: false, user_roles_user_id: { some: { role: 'admin' } } } }) <= 1) throw new HttpError(409, 'Mantenha ao menos um administrador ativo');
      await tx.auth_users.update({ where: { id: user_id }, data: { disabled: true, updated_at: new Date().toISOString() } });
      await tx.auth_sessions.deleteMany({ where: { user_id } });
      await tx.auth_activation_tokens.deleteMany({ where: { user_id } });
    });
    return { ok: true };
  });
}
