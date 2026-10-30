import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, model, Prisma, type Database } from './db.ts';
import { tables, defaults, references, type Row, type TableName } from './schema.ts';
import { authorizeWrite, readScope, requireCredentialAccess } from './policy.ts';
import { isManager, type Actor } from './auth.ts';
import { encryptCredential, decryptCredential } from './crypto.ts';
import { HttpError } from './config.ts';
import { queueCalendarMessage } from './outbox.ts';

const filterSchema = z.object({ column: z.string(), op: z.enum(['eq','neq','gt','gte','lt','lte','in','is','not','ilike']), value: z.unknown() });
export const querySchema = z.object({
  table: z.string(), operation: z.enum(['select','insert','update','delete','upsert']).default('select'),
  columns: z.string().max(1000).default('*'), filters: z.array(filterSchema).max(30).default([]),
  or: z.string().max(2000).optional(), order: z.array(z.object({ column: z.string(), ascending: z.boolean().default(true), nullsFirst: z.boolean().optional() })).max(5).default([]),
  limit: z.number().int().min(1).max(10000).default(1000), offset: z.number().int().min(0).max(1_000_000).default(0),
  single: z.enum(['one','maybe']).optional(), count: z.boolean().optional(), head: z.boolean().optional(), values: z.unknown().optional(),
});
export type Query = z.infer<typeof querySchema>;
export interface Change { table: TableName; eventType: 'INSERT'|'UPDATE'|'DELETE'; new: Row; old: Row }
let publish: (change: Change) => Promise<void> = async () => {};
export const onChange = (handler: typeof publish) => { publish = handler; };
function field(table: TableName, column: string) {
  if (!Object.hasOwn(tables[table],column)) throw new HttpError(400, `Campo inválido: ${column}`);
  const meta = (tables[table] as Record<string, { type: string; nullable: boolean }>)[column];
  if (!meta) throw new HttpError(400, `Campo inválido: ${column}`);
  return meta;
}
function whereFilter(table: TableName, filter: z.infer<typeof filterSchema>): Row {
  const meta = field(table, filter.column);
  let value = filter.value;
  if (value === 'null' && ['is','not'].includes(filter.op)) value = null;
  if (meta.type === 'boolean' && typeof value === 'string') value = value === 'true';
  if (meta.type === 'number' && typeof value === 'string') value = Number(value);
  if (filter.op === 'in') {
    if (!Array.isArray(value) || value.length > 1000 || value.some(v => typeof v === 'object' && v !== null)) throw new HttpError(400, 'Filtro inválido');
    return { [filter.column]: { in: value } };
  }
  if ((typeof value === 'object' && value !== null) || value === undefined) throw new HttpError(400, 'Filtro inválido');
  if (filter.op === 'ilike') {
    if (meta.type !== 'string' || typeof value !== 'string') throw new HttpError(400, 'Busca inválida');
    return { [filter.column]: { contains: value.replace(/^%|%$/g, '') } };
  }
  if (filter.op === 'eq' || filter.op === 'is') return { [filter.column]: value };
  return { [filter.column]: { [{ neq: 'not', not: 'not', gt: 'gt', gte: 'gte', lt: 'lt', lte: 'lte' }[filter.op]]: value } };
}
function buildWhere(query: Query, table: TableName, actor: Actor | null): Row {
  const clauses = query.filters.map(filter => whereFilter(table, filter));
  if (actor) clauses.push(readScope(table, actor));
  if (actor && table === 'tasks' && query.operation === 'select') clauses.push({ cancelled: false });
  if (query.or) {
    const parts = query.or.split(',');
    if (parts.length > 10) throw new HttpError(400, 'Filtro OR inválido');
    clauses.push({ OR: parts.map(part => {
      const [column, op, ...rest] = part.split('.');
      return whereFilter(table, filterSchema.parse({ column, op, value: rest.join('.') }));
    }) });
  }
  return { AND: clauses };
}
function validateData(table: TableName, input: unknown, create: boolean, actor: Actor | null): Row {
  if (!input || Array.isArray(input) || typeof input !== 'object') throw new HttpError(400, 'Registro inválido');
  const result: Row = create ? { ...defaults[table], ...input } : { ...input };
  if (create) {
    result.id ||= randomUUID();
    if ('created_at' in tables[table]) result.created_at ||= new Date().toISOString();
    if ('updated_at' in tables[table]) result.updated_at ||= new Date().toISOString();
    if (actor) for (const key of ['created_by', 'filmmaker_id', ...(table === 'task_comments' ? ['user_id'] : [])]) {
      if (key in tables[table]) result[key] = actor.id;
    }
  } else {
    if (actor && Object.keys(result).some(key => ['id','created_at','created_by','filmmaker_id','user_id'].includes(key))) throw new HttpError(403, 'Autor e identificadores não podem ser alterados');
    if ('updated_at' in tables[table]) result.updated_at = new Date().toISOString();
  }
  for (const [key, value] of Object.entries(result)) {
    const meta = field(table, key);
    if (value === null) { if (!meta.nullable) throw new HttpError(400, `${key} é obrigatório`); continue; }
    if (meta.type === 'json') { if (JSON.stringify(value).length > 100_000) throw new HttpError(413, 'Dados muito grandes'); continue; }
    if (typeof value !== meta.type || (typeof value === 'string' && value.length > 20000)) throw new HttpError(400, `Valor inválido para ${key}`);
    if ((key === 'id' || key.endsWith('_id') || ['created_by','assigned_to'].includes(key)) && value !== '' && typeof value === 'string' && !z.string().uuid().safeParse(value).success) throw new HttpError(400, `Identificador inválido: ${key}`);
  }
  const enums: Record<string, string[]> = {
    'tasks.status':['a_fazer','fazendo','feito'], 'tasks.priority':['baixa','media','alta'],
    'task_templates.priority':['baixa','media','alta'], 'user_roles.role':['admin','gerente','colaborador','filmmaker','designer'],
    'filmmaker_visits.status':['agendada','realizada','cancelada'], 'filmmaker_demands.status':['a_fazer','em_processo','terminado','alteracoes'],
    'posts.status':['agendado','postado','atrasado'],
  };
  for (const [key, value] of Object.entries(result)) if (enums[`${table}.${key}`] && !enums[`${table}.${key}`].includes(String(value))) throw new HttpError(400, `Valor inválido para ${key}`);
  if (create) for (const [key, meta] of Object.entries(tables[table])) if (!meta.nullable && result[key] === undefined) throw new HttpError(400, `Campo obrigatório: ${key}`);
  return result;
}
function prismaData(table: TableName, row: Row): Row {
  return Object.fromEntries(Object.entries(row).map(([key,value]) => [key, value === null && field(table,key).type === 'json' ? Prisma.DbNull : value]));
}
async function validateReferences(table: TableName, data: Row, database: Database) {
  for (const [column, [target]] of Object.entries(references[table])) {
    if (!data[column]) continue;
    const found = target === 'auth_users'
      ? await database.auth_users.findUnique({ where: { id: String(data[column]) } })
      : await model(target as TableName, database).findUnique({ where: { id: data[column] } });
    if (!found || (target === 'auth_users' && 'disabled' in found && found.disabled && ['assigned_to','target_user_id'].includes(column))) throw new HttpError(400, `Referência inválida: ${column}`);
  }
}
export function credentialWire(value: string) { return `utf8:${Buffer.from(value).toString('base64')}`; }
export function decodeCredentialWire(value: string) { return value.startsWith('utf8:') ? Buffer.from(value.slice(5),'base64').toString('utf8') : Buffer.from(value,'base64').toString('latin1'); }
async function project(table: TableName, row: Row, columns: string, privileged: boolean): Promise<Row> {
  const result = { ...row };
  if (table === 'client_passwords' && !privileged) result.encrypted_password = credentialWire(decryptCredential(String(row.encrypted_password), String(row.id)));
  if (columns.includes('clients(')) {
    if (!('client_id' in tables[table])) throw new HttpError(400, 'Relação inválida');
    result.clients = row.client_id ? await db.clients.findUnique({ where: { id: String(row.client_id) }, select: { name: true } }) : null;
  }
  const plain = columns.replace(/clients\(name\)/g, 'clients').split(',').map(value => value.trim()).filter(Boolean);
  if (plain.includes('*')) return result;
  for (const key of plain) if (key !== 'clients') field(table,key);
  return Object.fromEntries(plain.map(key => [key, result[key]]));
}
export async function executeQuery(input: unknown, actor: Actor | null, privileged = false) {
  const query = querySchema.parse(input);
  if (!Object.hasOwn(tables,query.table)) throw new HttpError(400,'Tabela inválida');
  if (!actor && !privileged) throw new HttpError(401,'Entre novamente');
  const table = query.table as TableName;
  const where = buildWhere(query,table,privileged ? null : actor);
  const delegate = model(table);
  let rows: Row[] = [], count: number | undefined;
  if (query.operation === 'select') {
    if (query.count) count = await delegate.count({ where });
    const orderBy = query.order.flatMap(order => order.column.split(',').map(column => { field(table,column.trim()); return { [column.trim()]: order.ascending ? 'asc' : 'desc' }; }));
    if (!query.head) rows = await delegate.findMany({ where, orderBy, skip: query.offset, take: query.limit });
    if (!privileged && table === 'profiles') {
      const active = await db.auth_users.findMany({ where:{disabled:false}, select:{id:true} });
      const ids = new Set(active.map(user=>user.id)); rows=rows.filter(row=>ids.has(String(row.user_id)));
    }
  } else {
    if (query.operation === 'upsert' && !privileged) throw new HttpError(400,'Use inserção ou atualização explícita');
    const changes: Change[] = [];
    rows = await db.$transaction(async tx => {
      const txModel = model(table,tx);
      if (table === 'user_roles' && !privileged && actor && !await tx.auth_users.findFirst({where:{id:actor.id,disabled:false,user_roles_user_id:{some:{role:'admin'}}}})) throw new HttpError(403,'Acesso restrito ao administrador');
      if (query.operation === 'insert' || query.operation === 'upsert') {
        const inputs = Array.isArray(query.values) ? query.values : [query.values];
        if (inputs.length > 1000) throw new HttpError(413,'Muitos registros');
        const output: Row[] = [];
        for (const input of inputs) {
          const data = validateData(table,input,true,privileged ? null : actor);
          if (!privileged && actor) {
            if (table === 'notifications') {
              data.created_by=actor.id; data.read_by=[];
            } else if (table === 'client_passwords') requireCredentialAccess(actor);
            else authorizeWrite(table,'insert',actor,data,input as Row);
          }
          if (table === 'client_passwords' && !privileged) data.encrypted_password=encryptCredential(decodeCredentialWire(String(data.encrypted_password)),String(data.id));
          await validateReferences(table,data,tx);
          const created = query.operation === 'upsert'
            ? await txModel.upsert({where:{id:data.id},create:prismaData(table,data),update:prismaData(table,data)})
            : await txModel.create({data:prismaData(table,data)});
          output.push(created); changes.push({table,eventType:'INSERT',new:created,old:{}});
          if(table==='calendar_events')await queueCalendarMessage(tx,'create',created,'Evento');
        }
        return output;
      }
      if (!query.filters.length && !privileged) throw new HttpError(400,'Selecione os registros a alterar');
      const previous=await txModel.findMany({where,take:1001});
      if(previous.length>1000) throw new HttpError(413,'Altere até 1000 registros por operação');
      const output:Row[]=[];
      for(const row of previous){
        let data=query.operation==='update'?validateData(table,query.values,false,privileged?null:actor):{};
        if(!privileged&&actor){
          if(table==='notifications'&&query.operation==='update') {
            if(Object.keys(query.values as Row).some(key=>key!=='read_by')) throw new HttpError(403,'Somente a leitura pode ser alterada');
            data={read_by:[...new Set([...(Array.isArray(row.read_by)?row.read_by:[]),actor.id])]};
          } else if(table==='client_passwords') requireCredentialAccess(actor);
          else authorizeWrite(table,query.operation,actor,row,query.values as Row ?? {});
        }
        if(table==='client_passwords'&&data.encrypted_password&&!privileged) data.encrypted_password=encryptCredential(decodeCredentialWire(String(data.encrypted_password)),String(row.id));
        await validateReferences(table,data,tx);
        const updated=query.operation==='delete'?await txModel.delete({where:{id:row.id}}):await txModel.update({where:{id:row.id},data:prismaData(table,data)});
        output.push(updated); changes.push({table,eventType:query.operation==='delete'?'DELETE':'UPDATE',old:row,new:query.operation==='delete'?{}:updated});
        if(table==='calendar_events'||(table==='filmmaker_visits'&&query.operation==='delete'))await queueCalendarMessage(tx,query.operation==='delete'?'cancel':'update',updated,table==='calendar_events'?'Evento':'Visita');
      }
      return output;
    },{timeout:15000});
    for(const change of changes) if(change.table!=='client_passwords') await publish(change);
  }
  rows=await Promise.all(rows.map(row=>project(table,row,query.columns,privileged)));
  if(query.single==='one'&&rows.length!==1) throw new HttpError(404,'Registro não encontrado ou resultado não único');
  if(query.single==='maybe'&&rows.length>1) throw new HttpError(409,'Resultado não único');
  return {data:query.head?null:query.single?(rows[0]??null):rows,error:null,count};
}
