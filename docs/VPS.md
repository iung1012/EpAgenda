# Instalação própria: Node.js, Prisma e SQLite

## Estrutura

- `/opt/epagenda/releases/<versao>`: código e interface compilada.
- `/opt/epagenda/current`: link para a versão ativa.
- `/opt/epagenda/shared/epagenda.env`: configuração, pertencente a root e legível pelo grupo epagenda.
- `/opt/epagenda/shared/data`: banco SQLite e uploads privados; gravável somente pelo usuário do serviço.
- `/opt/epagenda/shared/imports` e `backups`: acesso restrito a root.

O serviço `deploy/epagenda.service` escuta somente em `127.0.0.1:3102`. Instale `deploy/epagenda-logging.conf` em `/etc/nginx/conf.d/` e o vhost separado de `deploy/epagenda.nginx.conf`, teste `nginx -t` e recarregue o Nginx. O formato de log omite parâmetros que podem conter assinaturas de arquivos ou segredos do webhook. Preserve os outros vhosts e serviços da máquina. Aponte o DNS do domínio para a VPS antes de emitir o certificado HTTPS com Certbot. Não use as contas em produção por HTTP.

## Preparar uma versão

Use Node.js 22.12 ou superior e npm. Existem dois arquivos `package-lock.json`, um para a interface e outro para a API. Na raiz: `npm ci && npm run build`. Transfira o código e `dist/`, excluindo `.git`, `node_modules`, `.env`, `server/data` e `server/generated`. No diretório `server` da versão:

```sh
npm ci
npm run generate
DOTENV_CONFIG_PATH=/opt/epagenda/shared/epagenda.env node --import dotenv/config node_modules/prisma/build/index.js migrate deploy
```

O inicializador `deploy/init-env.mjs` cria as chaves aleatórias apenas quando o arquivo de configuração ainda não existe. Ele nunca substitui um arquivo existente. O argumento opcional é um `.env` local do Evolution; somente `AUTHENTICATION_API_KEY` é lido desse arquivo. Não publique a configuração nem imprima seus valores em logs. Código, dependências e cliente Prisma gerado precisam ser legíveis pelo usuário epagenda; com umask 077, ajuste essas permissões após instalar e gerar dependências. Mantenha banco, uploads e configuração com as permissões privadas descritas acima.

Para desenvolvimento local, copie `server/.env.example` para `server/.env`, preencha os segredos e use `NODE_ENV=development`. Execute `npm run dev` no diretório `server` e na raiz, em terminais separados. O Vite encaminha `/api` para a API na porta 3102. O comando `server/scripts/create-admin.ts` aceita JSON na entrada padrão para criar o primeiro administrador de um banco vazio; não passe senhas por argumentos do terminal.

## Importação inicial offline

O importador exige destino vazio e backup JSON já descriptografado em uma pasta privada. Ele restaura todas as tabelas numa transação, cifra as credenciais dos clientes e verifica contagens, conteúdo dos arquivos, descriptografia das credenciais e integridade SQLite:

```sh
DOTENV_CONFIG_PATH=/opt/epagenda/shared/epagenda.env node --import dotenv/config --import tsx scripts/import-backup.ts --input /opt/epagenda/shared/imports/application-backup.json --create-activation-links --origin https://epagenda.site
```

Backups antigos do aplicativo não contêm hashes de login. As contas preservam seus IDs, e-mails, cargos e histórico; cada usuário define uma nova senha por um link individual de uso único, válido por sete dias. Os tokens são armazenados como hashes. O CSV com os links é privado e deve ser entregue pelo administrador a cada titular. Não envie o CSV ao Git nem coloque seus links em logs. Após importar, mova `data/activation-links.csv` para `shared/activation-links.csv` com permissão 600, acessível somente a root. O relatório sem senhas fica em `data/migration-report.json`.

## Integrações e rotinas

- WhatsApp: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_WEBHOOK_SECRET`. O webhook usa o domínio público configurado em `APP_ORIGIN`.
- Drive: `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON em uma única linha) e, opcionalmente, `GOOGLE_DRIVE_ROOT_FOLDER_ID`. Compartilhe as pastas com a conta de serviço.
- Assistente: `OPENAI_API_KEY`. Sem essa chave o assistente retorna um erro de configuração, sem gerar respostas.

Esses segredos não fazem parte do backup do aplicativo. As rotinas permanecem desligadas com `ENABLE_JOBS=0` durante a transferência. Após validar domínio, HTTPS e integrações, altere para `1` e reinicie o serviço. Lembretes e mensagens usam transações e uma fila local com tentativas limitadas. Não faça testes de envio para pessoas sem autorização.

## Verificação

```sh
npm run typecheck
npm run lint
npm run build
npm --prefix server run generate
npm --prefix server run typecheck
npm --prefix server test
```

Os testes usam um banco temporário e verificam permissões, credenciais cifradas, arquivos privados, operações de visitas, backups e ativação de contas.

## Recuperação e atualizações

Execute `deploy/backup.sh` como root antes de atualizar. O script cria uma cópia consistente do SQLite, verifica sua integridade e copia uploads, configuração e links de ativação existentes para uma pasta privada. Copie o backup também para um local separado da VPS. As chaves de configuração são necessárias para descriptografar credenciais e validar arquivos; preserve-as junto com o banco, com acesso restrito.

Para restaurar, pare o serviço, preserve uma cópia do estado atual e restaure banco, uploads e configuração do mesmo conjunto de backup. Verifique `SHA256SUMS`, `PRAGMA integrity_check` e `PRAGMA foreign_key_check`; confira permissões e inicie o serviço. Não substitua apenas o arquivo principal de um banco SQLite ainda aberto com WAL.

Para atualizar código, prepare uma nova pasta de versão, instale dependências, gere o Prisma, faça o backup e aplique as migrações. Troque o link `current`, reinicie e verifique `/api/health`. Para voltar uma versão, verifique antes se o esquema continua compatível; restaure o conjunto de backup quando necessário. A origem Supabase deve permanecer disponível até a validação da migração e do primeiro acesso dos usuários.
