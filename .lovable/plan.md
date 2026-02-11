

# Corrigir Notificações de Menção Aparecendo Para Todos

## Problema
Quando alguém menciona um usuário em um comentário de tarefa, **todos** os outros usuários recebem a notificação push do Chrome, não apenas o mencionado. Isso acontece porque:

1. A função `notifyMentionedUsers` cria um registro na tabela `notifications` para cada usuário mencionado, mas a tabela não tem campo para indicar **quem** deve receber
2. No `useNotifications.ts`, a notificação push é disparada para **qualquer** usuário que não seja o criador: `newNotif.created_by !== user.id`

## Solução

### 1. Adicionar coluna `target_user_id` na tabela `notifications`
- Nova coluna opcional (`uuid`, nullable) que indica para quem a notificação é destinada
- Quando `null`, a notificação é para todos (comportamento atual para avisos gerais)
- Quando preenchido, apenas aquele usuário deve receber

### 2. Atualizar `TaskComments.tsx`
- No `notifyMentionedUsers`, passar o `userId` mencionado como `target_user_id` no insert

### 3. Atualizar `useNotifications.ts`
- Na busca de notificações: filtrar para mostrar apenas notificações onde `target_user_id` é `null` (para todos) **ou** igual ao `user.id` (para o usuário logado)
- Na notificação push do Chrome: adicionar a mesma verificação — só disparar push se `target_user_id` for `null` ou igual ao `user.id`

### 4. Atualizar contagem de não lidas
- O `unreadCount` passará a considerar apenas notificações visíveis para o usuário

## Detalhes Técnicos

### Migração SQL
```sql
ALTER TABLE notifications ADD COLUMN target_user_id uuid;
```

### Filtro na query de busca
```typescript
// Buscar notificações para todos OU direcionadas ao usuário
.or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
```

### Filtro no push do Chrome
```typescript
if (
  user &&
  newNotif.created_by !== user.id &&
  (newNotif.target_user_id === null || newNotif.target_user_id === user.id)
) { ... }
```

### Insert com target
```typescript
await supabase.from('notifications').insert({
  title: `mensagem`,
  message: `conteudo`,
  created_by: user.id,
  target_user_id: userId, // usuario mencionado
});
```

