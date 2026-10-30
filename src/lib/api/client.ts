import type { Database } from './types';

type TableName = keyof Database['public']['Tables'];
type TableRow<N extends TableName> = Database['public']['Tables'][N]['Row'] & { clients?: { name: string } | null };
export interface User { id: string; email?: string }
export interface Session { user: User; access_token: string }
export interface ApiError extends Error { context?: Response; code?: string }
export interface Result<T> { data: T | null; error: ApiError | null; count?: number | null }
export type IntegrationData = { [key: string]: unknown; qrcode?: string | null; status?: string; sent?: number; skipped?: string; failures?: { body?: string }[]; records?: number; files?: number; error?: string };
const apiRoot = '/api';
async function request<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<Result<T>> {
  try {
    const response = await fetch(`${apiRoot}${path}`, { method, credentials: 'same-origin', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) {
      const detail = await response.clone().json().catch(() => ({}));
      const error: ApiError = Object.assign(new Error(detail.error || 'Não foi possível concluir a operação'), { context: response, code: detail.code });
      return { data: null, error };
    }
    return { data: await response.json() as T, error: null };
  } catch (cause) { return { data: null, error: cause instanceof Error ? cause : new Error('Falha de conexão') }; }
}
type QueryState = { table: TableName; operation: string; columns: string; filters: { column: string; op: string; value: unknown }[]; order: { column: string; ascending: boolean; nullsFirst?: boolean }[]; [key: string]: unknown };
class Query<N extends TableName, S extends boolean = false> implements PromiseLike<Result<S extends true ? TableRow<N> : TableRow<N>[]>> {
  private state: QueryState;
  constructor(table: N) { this.state = { table, operation: 'select', columns: '*', filters: [], order: [] }; }
  select(columns = '*', options?: { count?: string; head?: boolean }) { this.state.columns = columns; this.state.count = !!options?.count; this.state.head = !!options?.head; return this; }
  insert(values: unknown) { this.state.operation = 'insert'; this.state.values = values; return this; }
  update(values: unknown) { this.state.operation = 'update'; this.state.values = values; return this; }
  delete() { this.state.operation = 'delete'; return this; }
  upsert(values: unknown) { this.state.operation = 'upsert'; this.state.values = values; return this; }
  private filter(column: string, op: string, value: unknown) { this.state.filters.push({ column, op, value }); return this; }
  eq(column: string, value: unknown) { return this.filter(column, 'eq', value); }
  neq(column: string, value: unknown) { return this.filter(column, 'neq', value); }
  gt(column: string, value: unknown) { return this.filter(column, 'gt', value); }
  gte(column: string, value: unknown) { return this.filter(column, 'gte', value); }
  lt(column: string, value: unknown) { return this.filter(column, 'lt', value); }
  lte(column: string, value: unknown) { return this.filter(column, 'lte', value); }
  in(column: string, value: unknown[]) { return this.filter(column, 'in', value); }
  is(column: string, value: unknown) { return this.filter(column, 'is', value); }
  not(column: string, operator: string, value: unknown) { if (operator !== 'is') throw new Error('Operador inválido'); return this.filter(column, 'not', value); }
  ilike(column: string, value: string) { return this.filter(column, 'ilike', value); }
  or(value: string) { this.state.or = value; return this; }
  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) { this.state.order.push({ column, ascending: options.ascending !== false, nullsFirst: options.nullsFirst }); return this; }
  limit(value: number) { this.state.limit = value; return this; }
  range(from: number, to: number) { this.state.offset = from; this.state.limit = to - from + 1; return this; }
  single(): Query<N, true> { this.state.single = 'one'; return this as unknown as Query<N, true>; }
  maybeSingle(): Query<N, true> { this.state.single = 'maybe'; return this as unknown as Query<N, true>; }
  async execute(): Promise<Result<S extends true ? TableRow<N> : TableRow<N>[]>> {
    const result = await request<Result<S extends true ? TableRow<N> : TableRow<N>[]>>('/query', this.state);
    return result.error ? { data: null, error: result.error } : result.data!;
  }
  then<TResult1 = Result<S extends true ? TableRow<N> : TableRow<N>[]>, TResult2 = never>(onfulfilled?: ((value: Result<S extends true ? TableRow<N> : TableRow<N>[]>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> { return this.execute().then(onfulfilled, onrejected); }
}
type AuthListener = (event: string, session: Session | null) => void;
const authListeners = new Set<AuthListener>();
const sessionFor = (user: User | null): Session | null => user ? { user, access_token: 'http-only-cookie' } : null;
const emitAuth = (event: string, user: User | null) => authListeners.forEach(listener => listener(event, sessionFor(user)));
type ChangePayload = { eventType: string; table: string; new: Record<string, unknown>; old: Record<string, unknown> };
class Channel {
  private source: EventSource | null = null;
  private listeners: { filter: { event: string; table: string; filter?: string }; handler: (payload: ChangePayload) => void }[] = [];
  on(_type: string, filter: { event: string; schema?: string; table: string; filter?: string }, handler: (payload: ChangePayload) => void) { this.listeners.push({ filter, handler }); return this; }
  subscribe() {
    this.source = new EventSource('/api/events');
    this.source.onmessage = event => {
      const payload = JSON.parse(event.data) as ChangePayload;
      for (const { filter, handler } of this.listeners) {
        if (filter.table !== payload.table || (filter.event !== '*' && filter.event !== payload.eventType)) continue;
        if (filter.filter) { const [column, value] = filter.filter.split('=eq.'); if (String((payload.new[column] ?? payload.old[column])) !== value) continue; }
        handler(payload);
      }
    };
    return this;
  }
  close() { this.source?.close(); this.source = null; }
}
function bucketClient(bucket: string) {
  const filePath = (path: string) => `/storage/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return {
    async upload(path: string, file: Blob, options?: { upsert?: boolean; cacheControl?: string }) {
      const body = new FormData(); body.set('file', file); body.set('upsert', String(!!options?.upsert));
      try {
        const response = await fetch(`/api${filePath(path)}`, { method: 'POST', body, credentials: 'same-origin' });
        if (!response.ok) { const error = await response.json(); return { data: null, error: new Error(error.error || 'Falha ao enviar arquivo') }; }
        return { data: await response.json() as { path: string }, error: null };
      } catch (error) { return { data: null, error: error instanceof Error ? error : new Error('Falha de conexão') }; }
    },
    getPublicUrl(path: string) { return { data: { publicUrl: `/api${filePath(path)}` } }; },
    async createSignedUrl(path: string, expiresIn: number) { return request<{ signedUrl: string }>('/storage/sign', { bucket, path, expiresIn }); },
    async remove(paths: string[]) { return request('/storage/remove', { bucket, paths }); },
  };
}
export const api = {
  from<N extends TableName>(table: N) { return new Query(table); },
  functions: { invoke<T = IntegrationData>(name: string, options?: { body?: unknown }) { return request<T>(`/functions/${encodeURIComponent(name)}`, options?.body ?? {}); } },
  rpc<T = unknown>(name: string, args?: unknown) { return request<T>(`/rpc/${encodeURIComponent(name)}`, args ?? {}); },
  storage: { from: bucketClient },
  channel(_name: string) { return new Channel(); },
  removeChannel(channel: Channel) { channel.close(); return Promise.resolve(); },
  auth: {
    async getSession() { const result = await request<{ user: User | null }>('/auth/session'); return { data: { session: sessionFor(result.data?.user ?? null) }, error: result.error }; },
    async getUser() { const result = await request<{ user: User | null }>('/auth/session'); return { data: { user: result.data?.user ?? null }, error: result.error }; },
    async signInWithPassword(body: { email: string; password: string }) { const result = await request<{ user: User }>('/auth/login', body); if (result.data) emitAuth('SIGNED_IN', result.data.user); return result; },
    async signUp(_body: unknown) { return { data: null, error: new Error('Solicite sua conta ao administrador da agência') }; },
    async signOut() { const result = await request('/auth/logout', {}); emitAuth('SIGNED_OUT', null); return result; },
    async updateUser(body: { password: string }) { return request('/auth/password', body); },
    async activate(body: { token: string; password: string }) { return request<{ email: string }>('/auth/activate', body); },
    onAuthStateChange(listener: AuthListener) { authListeners.add(listener); return { data: { subscription: { unsubscribe() { authListeners.delete(listener); } } } }; },
  },
};
