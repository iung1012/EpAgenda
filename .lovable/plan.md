
# Plano: Adicionar Feed do Instagram (Elfsight) na Página do Cliente Priorize 360

## Objetivo
Adicionar o widget Elfsight do Instagram Feed abaixo da seção "Informações de Contato" na página de detalhes do cliente **Priorize 360** (ID: `cb5332c8-540b-4c7c-859e-4a131575622c`).

## Implementação

### 1. Criar Componente ElfsightInstagramFeed
Criar um componente React reutilizável que carrega o script do Elfsight e renderiza o widget:

- **Arquivo**: `src/components/clients/ElfsightInstagramFeed.tsx`
- O componente usará `useEffect` para carregar o script dinamicamente
- Receberá o `appId` como prop para permitir futura expansão a outros clientes

### 2. Modificar ClientDetail.tsx
Adicionar o componente do Instagram Feed abaixo da seção de informações de contato (após linha 811), condicionalmente para o cliente Priorize 360:

```text
┌─────────────────────────────────────────┐
│ Card: Informações de Contato            │
│  - Nome do Contato                      │
│  - Email                                │
│  - Telefone                             │
│  - Segmento                             │
│  - Observações                          │
├─────────────────────────────────────────┤
│ Card: Feed do Instagram (NOVO)          │
│  [Widget Elfsight do Instagram]         │
└─────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Componente ElfsightInstagramFeed
- Carrega o script `https://elfsightcdn.com/platform.js` apenas uma vez
- Renderiza o div com `data-elfsight-app-lazy` para carregamento otimizado
- Usa o `appId`: `e87f6cb1-d6c6-4878-9cc5-5695a4488ad3`

### Condição de Exibição
O widget será exibido apenas quando:
- `client.id === 'cb5332c8-540b-4c7c-859e-4a131575622c'` (Priorize 360)

### Arquivos a Modificar
1. **Criar**: `src/components/clients/ElfsightInstagramFeed.tsx`
2. **Editar**: `src/pages/ClientDetail.tsx` - adicionar import e renderização condicional do componente
