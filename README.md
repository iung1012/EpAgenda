# EpAgenda

Agenda e gestão de clientes, tarefas, visitas e publicações. A interface usa React/Vite; a API própria usa Node.js, Fastify, Prisma e SQLite. O aplicativo funciona sem Supabase ou Lovable. Consulte [a instalação na VPS](docs/VPS.md).

## Desenvolvimento

Use Node.js 22.12 ou superior e npm. Instale as dependências com npm ci na raiz e no diretório server. Copie server/.env.example para server/.env, configure as chaves e use NODE_ENV=development em HTTP local. No servidor, execute npm run generate, npm run migrate e npm run dev. Em outro terminal, execute npm run dev na raiz.

## Verificação

Execute npm run typecheck, npm run lint e npm run build na raiz. No diretório server, execute npm run generate, npm run typecheck e npm test. Os testes usam um banco temporário para verificar permissões, credenciais cifradas, arquivos privados, visitas, backups e ativação de contas.

## Produção

O serviço serve a interface compilada e a API na mesma origem, atrás do Nginx com HTTPS. Sessões usam cookies HttpOnly; senhas de login usam bcrypt; credenciais de serviços dos clientes usam AES-256-GCM no banco.

O backup do aplicativo é cifrado no navegador e inclui somente tabelas e arquivos permitidos. O backup de infraestrutura via SSH preserva o banco completo e suas chaves de recuperação. Nunca coloque dados, links de ativação ou segredos no Git.

As funções e migrações antigas estão em migration/legacy/ para consulta histórica. A estrutura ativa do banco está em server/prisma/.
