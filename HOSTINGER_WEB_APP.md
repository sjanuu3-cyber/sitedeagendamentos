# Deploy na Hostinger Sem VPS

Este projeto foi adaptado para rodar com:

- Node.js Web App da Hostinger
- MySQL da propria Hostinger
- Express servindo o frontend e a API no mesmo app

## 1. O que mudou

- banco migrado de PostgreSQL para MySQL
- conexao usando `mysql2`
- schema em `backend/src/db/schema.sql`
- entrada na raiz do repositorio com:
  - `package.json`
  - `server.js`

Isso facilita o import direto do GitHub no deploy da Hostinger.

## 2. O que voce precisa ter no plano

Segundo a documentacao oficial da Hostinger:

- Node.js Web App disponivel em planos Business e Cloud
- banco MySQL criado no hPanel

Referencias:

- Node.js Web App: https://www.hostinger.com/support/?p=6553
- MySQL database: https://www.hostinger.com/support/1583542-how-to-create-a-new-mysql-database-in-hostinger
- detalhes do MySQL: https://www.hostinger.com/support/1583552-how-to-find-your-mysql-database-details-in-hostinger/
- variaveis de ambiente: https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/

## 3. Criar o banco MySQL

No hPanel:

1. Va em `Websites`
2. Clique em `Dashboard` do site
3. Abra `Databases Management`
4. Crie:
   - banco
   - usuario
   - senha

Na Hostinger, o host do MySQL costuma ser:

- `localhost`

## 4. Aplicar o schema

Abra o phpMyAdmin da Hostinger e execute o arquivo:

- `backend/src/db/schema.sql`

Isso vai criar:

- `empresas`
- `usuarios`
- `profissionais`
- `servicos`
- `agendamentos`

## 5. Deploy do app Node.js pela Hostinger

No hPanel:

1. Va em `Websites`
2. Clique em `Add Website`
3. Escolha `Node.js Apps`
4. Escolha `Import Git Repository`
5. Conecte ao GitHub
6. Selecione o repositorio:
   - `sjanuu3-cyber/sitedeagendamentos`

## 6. Configuracao sugerida no deploy

Se a Hostinger detectar automaticamente, otimo.

Se precisar preencher manualmente:

- framework: `Other` ou `Express.js`
- entry file: `server.js`
- node version: `20.x` ou superior

## 7. Variaveis de ambiente

Use estas variaveis no deploy:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=SEU_USUARIO_MYSQL
DB_PASSWORD=SUA_SENHA_MYSQL
DB_NAME=SEU_BANCO_MYSQL
DB_SSL=false
JWT_SECRET=gere-uma-chave-longa-e-segura
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://seudominio.com,https://www.seudominio.com
TRUST_PROXY=true
```

Se preferir, tambem pode importar a base de:

- `backend/.env.example`

## 8. Como o build funciona

O deploy na raiz usa:

- `package.json` da raiz
- `server.js` da raiz

No `postinstall`, a raiz instala automaticamente as dependencias de `backend`.

## 9. Checklist final

- repositorio no GitHub
- banco MySQL criado
- schema aplicado no phpMyAdmin
- variaveis de ambiente configuradas
- dominio conectado ao app
- teste de:
  - `/api/health`
  - criacao de espaco
  - login
  - painel admin
  - agendamento publico
