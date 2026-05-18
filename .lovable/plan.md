## Entrega: 3 features novas

### 1. Página de Postagens (Calendário)
- Nova rota `/postagens` no menu lateral (ícone Instagram).
- Nova tabela `posts`: `client_id`, `title`, `caption`, `scheduled_date`, `posted_at`, `status` (`agendado`/`postado`/`atrasado`), `platform` (instagram/facebook/tiktok/etc), `media_url`, `link`, `created_by`.
- Visão calendário mensal (reaproveitando o padrão de `MonthView`) com:
  - Pontos coloridos por status (verde = postado, amarelo = agendado, vermelho = atrasado).
  - Filtro por cliente e plataforma.
  - Clique no dia abre dialog listando posts daquele dia, com botão "Marcar como postado" (preenche `posted_at`).
- Formulário de criação/edição de post (dialog).
- RLS: todos autenticados veem; criador ou admin/gerente edita/exclui.

### 2. Wizard de criação de Visita (com Equipamentos)
- Refatorar `VisitFormDialog.tsx` em wizard de 3 passos:
  1. **Dados da visita** — título, cliente, data, local, descrição.
  2. **Equipamentos** — seleção múltipla a partir da tabela `equipment` (cria registros em `visit_equipment`).
  3. **Concluir** — resumo + botão "Criar visita".
- Indicador de progresso no topo (Steps), botões Voltar/Avançar.
- Página de Demandas continua intacta.

### 3. Página global de Pautas
- Nova rota `/pautas` no menu lateral (ícone FileText).
- Nova tabela `pautas`: `title`, `description`, `client_id`, `created_by`.
- Nova coluna `pauta_id` (nullable) em `tasks` para agrupar tarefas dentro de uma pauta.
- UI: lista de pautas em accordion/cards expansíveis; ao expandir mostra as tarefas vinculadas, com botão para criar tarefa já associada à pauta.
- Filtro por cliente.
- RLS: todos autenticados veem; criador ou admin/gerente edita/exclui.

### Detalhes técnicos
- Migration cria `posts`, `pautas`, adiciona `pauta_id` em `tasks`, RLS completas.
- Sidebar: adicionar links "Postagens" e "Pautas".
- Hooks novos: `usePosts`, `usePautas`. `useTasks` ganha suporte opcional a `pauta_id`.
- Componentes novos:
  - `src/pages/Posts.tsx`, `src/components/posts/PostsCalendar.tsx`, `src/components/forms/PostFormDialog.tsx`, `src/components/posts/DayPostsDialog.tsx`.
  - `src/pages/Pautas.tsx`, `src/components/forms/PautaFormDialog.tsx`.
  - `VisitFormDialog` reescrito como wizard (mantém mesma API de props).
- Sem mudanças em RLS de tabelas existentes.

### Fora de escopo
- Integração automática com APIs do Instagram/Meta (postagem real).
- Notificações de pauta atrasada (pode vir depois).