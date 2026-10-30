# Propostas de segurança e integridade — rascunho

Estes scripts são trabalho em andamento. **Não estão prontos para execução ou implantação.** Foram mantidos fora de `supabase/migrations` para que publicar esta branch não adicione migrações ao fluxo normal de implantação.

A revisão de referência é `20704dd21350424e3b69addb72ca78d6c81ba446`. O pedido é corrigir os problemas encontrados na análise, preservando primeiro um backup completo, inclusive usuários e senhas.

## Estado do backup

- Código original: cópia local verificada, com 227 arquivos conferidos por SHA-256.
- Trabalho local e snapshot Git: cópias locais salvas.
- Banco em produção: exportação completa pendente no Lovable.
- Contas de autenticação e hashes de senha: backup pendente.
- Arquivos enviados ao Storage: backup pendente.

O backup do código não contém os dados de produção. Nenhuma migração foi aplicada ao banco e nenhuma conta ou senha foi alterada.

A [exportação oficial do Lovable](https://docs.lovable.dev/features/database-backups) inclui o banco, contas e hashes de senha. Os arquivos do Storage precisam de cópia separada. Essa exportação pela plataforma é distinta do backup criptografado do aplicativo, que continua sem exportar credenciais de autenticação gerenciada ou secrets de infraestrutura, conforme `AGENTS.md`.

## Conteúdo dos rascunhos

| Script | Proposta |
| --- | --- |
| `20261030140000_access_and_private_storage.sql` | Verificação de vínculo ativo, provisionamento controlado de contas, revogação de acesso, leitura segura de cargos, arquivos privados e leitura atômica de notificações. |
| `20261030140100_atomic_visits.sql` | Operação transacional de visita, equipamentos e tarefa vinculada, com autorização e sincronização de responsável, prazo e lembrete. |

## Dependências antes de transformar em migrações

1. Concluir e verificar o backup completo do Lovable, das contas e do Storage.
2. Implementar e testar o serviço de criptografia das credenciais de clientes, incluindo conversão das senhas legadas e portabilidade do backup. Revogar o acesso direto a `client_passwords` antes disso interromperia o cofre atual.
3. Adaptar a criação de usuários pelo administrador ao marcador confiável em `app_metadata`; integrar o fluxo de desativação, sem apagar o histórico da equipe.
4. Substituir as URLs públicas por acesso autenticado ou URLs assinadas, inclusive nos arquivos já cadastrados, antes de tornar o bucket privado.
5. Integrar as novas funções de equipe e notificações ao frontend.
6. Integrar os formulários e o arraste de visitas à operação transacional. Revisar o movimento por responsável, para que permissões de leitura não excluam equipamentos silenciosamente.
7. Definir o tratamento de cancelamento de visitas sem apresentar entregas canceladas como concluídas. O rascunho atual ainda precisa dessa correção.
8. Validar todos os scripts em um banco isolado, com testes de permissão, falhas e rollback, antes de movê-los para `supabase/migrations`.

Lembretes/cron, consultas da IA, tratamento de erros do WhatsApp, dependências, lint e demais ajustes da análise ainda estão pendentes de implementação. Publicar estes rascunhos não significa que as correções do aplicativo estejam concluídas.

## Validação desta publicação

Esta publicação contém somente documentação e propostas SQL, sem alteração do comportamento da aplicação. A conferência de diff e do conjunto de migrações é feita antes do envio. Os scripts não foram executados em um banco de dados e a integração com o frontend não foi validada.
