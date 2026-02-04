
# Plano: Remover Cliente e Todos os Dados Relacionados

## Objetivo
Adicionar funcionalidade para que administradores/gerentes possam excluir um cliente e todos os seus dados relacionados do banco de dados.

## Implementação

### 1. Adicionar Botão de Exclusão na Página do Cliente
Adicionar um botão vermelho "Excluir Cliente" no cabeçalho da página `ClientDetail.tsx`, visível apenas para admins/gerentes.

### 2. Diálogo de Confirmação
Usar o componente `ConfirmDialog` existente para confirmar a exclusão, com aviso claro sobre a ação irreversível.

### 3. Função de Exclusão em Cascata
Criar função que deleta dados na seguinte ordem:

```text
┌─────────────────────────────────────────┐
│ 1. client_passwords                     │
│ 2. client_folders                       │
│ 3. client_drive_folders                 │
│ 4. tasks (onde client_id = cliente)     │
│ 5. calendar_events (onde client_id)     │
│ 6. filmmaker_visits (onde client_id)    │
│ 7. filmmaker_demands (onde client_id)   │
│ 8. clients (registro principal)         │
└─────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Arquivo a Modificar
- `src/pages/ClientDetail.tsx`

### Mudanças no Código

**1. Novo estado para controle do diálogo:**
```typescript
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
```

**2. Função de exclusão:**
```typescript
const handleDeleteClient = async () => {
  if (!id || !isAdminOrManager) return;
  
  setIsDeleting(true);
  
  // Deletar em ordem
  await supabase.from('client_passwords').delete().eq('client_id', id);
  await supabase.from('client_folders').delete().eq('client_id', id);
  await supabase.from('client_drive_folders').delete().eq('client_id', id);
  await supabase.from('tasks').delete().eq('client_id', id);
  await supabase.from('calendar_events').delete().eq('client_id', id);
  await supabase.from('filmmaker_visits').delete().eq('client_id', id);
  await supabase.from('filmmaker_demands').delete().eq('client_id', id);
  
  const { error } = await supabase.from('clients').delete().eq('id', id);
  
  if (error) {
    toast({ variant: 'destructive', title: 'Erro', description: error.message });
  } else {
    toast({ title: 'Cliente excluído com sucesso!' });
    navigate('/clients');
  }
  
  setIsDeleting(false);
};
```

**3. Botão no cabeçalho (apenas para admins/gerentes):**
```tsx
{isAdminOrManager && (
  <Button 
    variant="destructive" 
    onClick={() => setIsDeleteDialogOpen(true)}
  >
    <Trash2 className="h-4 w-4 mr-2" />
    Excluir Cliente
  </Button>
)}
```

**4. Diálogo de confirmação:**
```tsx
<ConfirmDialog
  open={isDeleteDialogOpen}
  onOpenChange={setIsDeleteDialogOpen}
  title="Excluir Cliente"
  description={`Tem certeza que deseja excluir "${client?.name}"? Esta ação irá remover permanentemente o cliente e TODOS os dados relacionados (senhas, pastas, tarefas, eventos, visitas e demandas). Esta ação NÃO pode ser desfeita.`}
  confirmText="Excluir Permanentemente"
  onConfirm={handleDeleteClient}
  variant="destructive"
  isLoading={isDeleting}
/>
```

### Segurança
- Botão visível apenas para `isAdminOrManager`
- RLS do banco já protege a operação de DELETE
- Confirmação dupla com texto descritivo
