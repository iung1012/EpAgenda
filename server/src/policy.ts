import type { Actor } from './auth.ts';
import { isManager } from './auth.ts';
import { HttpError } from './config.ts';
import type { Row, TableName } from './schema.ts';

export function readScope(table: TableName, actor: Actor): Row {
  if (table === 'client_passwords') { requireCredentialAccess(actor); return {}; }
  if (table.startsWith('whatsapp_')) {
    if (!isManager(actor)) throw new HttpError(403, 'Acesso restrito à administração');
    if (table === 'whatsapp_ai_messages' && actor.role !== 'admin') throw new HttpError(403, 'Acesso restrito ao administrador');
  }
  if (table === 'user_roles' && !isManager(actor)) return { user_id: actor.id };
  if (table === 'notifications') return { OR: [{ target_user_id: null }, { target_user_id: actor.id }, { created_by: actor.id }] };
  if (table === 'filmmaker_demands' && !isManager(actor)) return { OR: [{ filmmaker_id: actor.id }, { assigned_to: actor.id }] };
  return {};
}
export function requireCredentialAccess(actor: Actor) {
  if (!isManager(actor)) throw new HttpError(403, 'Acesso restrito à administração');
}
export function authorizeWrite(table: TableName, operation: string, actor: Actor, row: Row, values: Row) {
  if(table==='visit_equipment'||(table==='filmmaker_visits'&&operation!=='delete'))throw new HttpError(400,'Use a operação transacional de visitas');
  if (table === 'client_passwords' || table === 'notifications') throw new HttpError(403, 'Use a operação específica para este registro');
  if (table === 'profiles') {
    if (operation !== 'update' || (row.user_id !== actor.id && actor.role !== 'admin')) throw new HttpError(403, 'Sem permissão para alterar este perfil');
    if (Object.keys(values).some(key => !['full_name', 'avatar_url', 'phone', 'birthday'].includes(key))) throw new HttpError(403, 'Campo de perfil não permitido');
    return;
  }
  if (table === 'user_roles') {
    if (actor.role !== 'admin' || operation !== 'update' || row.user_id === actor.id || Object.keys(values).some(key => key !== 'role')) throw new HttpError(403, 'Sem permissão para alterar cargos');
    return;
  }
  if (table === 'equipment' && actor.role !== 'admin') throw new HttpError(403, 'Apenas administradores podem gerenciar equipamentos');
  if (table.startsWith('whatsapp_') && (!isManager(actor) || !['whatsapp_recipients', 'whatsapp_config'].includes(table))) throw new HttpError(403, 'Operação não permitida');
  if (isManager(actor)) return;
  if (['equipment', 'user_roles'].includes(table)) throw new HttpError(403, 'Operação não permitida');
  if (operation === 'insert' && ['clients', 'tasks', 'calendar_events', 'client_folders', 'task_comments', 'task_templates', 'pautas', 'posts'].includes(table)) return;
  if (table === 'posts') return; // Shared daily posting checklist.
  if (table === 'clients' && row.created_by !== actor.id) throw new HttpError(403, 'Somente o criador ou a administração pode editar este cliente');
  if (['filmmaker_visits', 'filmmaker_demands'].includes(table)) {
    if (operation === 'insert' && actor.role !== 'filmmaker') throw new HttpError(403, 'Sem permissão para criar visitas/demandas');
    if (operation === 'delete' || (row.filmmaker_id !== actor.id && row.assigned_to !== actor.id)) throw new HttpError(403, 'Sem permissão para esta visita/demanda');
    return;
  }
  if (table === 'tasks' || table === 'calendar_events') {
    if (operation === 'delete' || (row.created_by !== actor.id && row.assigned_to !== actor.id)) throw new HttpError(403, 'Sem permissão para alterar este registro');
    if (row.created_by !== actor.id && Object.keys(values).some(key => !['status', 'delivery_link'].includes(key))) throw new HttpError(403, 'O responsável pode atualizar somente status e entrega');
    return;
  }
  if (row.created_by === actor.id || row.user_id === actor.id) return;
  throw new HttpError(403, 'Sem permissão para alterar este registro');
}
