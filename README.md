# Sistema de Agendamento Multiempresa

Projeto full stack com:

- Frontend em HTML, CSS e JavaScript puro
- Backend em Node.js com Express
- Banco de dados MySQL
- Arquitetura multi-tenant com separação por `empresa_id`

Guia recomendado para publicar sem VPS na Hostinger:

- `HOSTINGER_WEB_APP.md`

## Fluxo atual de uso

O sistema agora funciona em dois niveis:

- Portal central: usado so para criar um novo espaco ou localizar um espaco existente
- Espaco da empresa: usado no dia a dia pela propria empresa e pelos clientes dela

URLs principais:

- `/` portal central
- `/criar-espaco` cadastro de uma nova empresa
- `/espaco/:slug` agenda publica da empresa
- `/espaco/:slug/login` login do painel da empresa
- `/espaco/:slug/admin` painel admin da empresa

## 1. Estrutura do projeto

```text
multi-tenant/
├─ backend/
│  ├─ .env.example
│  ├─ package.json
│  └─ src/
│     ├─ app.js
│     ├─ server.js
│     ├─ config/
│     │  └─ database.js
│     ├─ controllers/
│     │  ├─ appointmentController.js
│     │  ├─ authController.js
│     │  ├─ companyController.js
│     │  ├─ professionalController.js
│     │  └─ serviceController.js
│     ├─ db/
│     │  └─ schema.sql
│     ├─ middleware/
│     │  ├─ authMiddleware.js
│     │  └─ errorHandler.js
│     ├─ routes/
│     │  ├─ appointmentRoutes.js
│     │  ├─ authRoutes.js
│     │  ├─ companyRoutes.js
│     │  ├─ professionalRoutes.js
│     │  └─ serviceRoutes.js
│     ├─ services/
│     │  ├─ availabilityService.js
│     │  └─ schedulingService.js
│     └─ utils/
│        ├─ errors.js
│        ├─ time.js
│        └─ validation.js
├─ frontend/
│  ├─ create-space.html
│  ├─ admin.html
│  ├─ index.html
│  ├─ portal.html
│  ├─ tenant-booking.html
│  ├─ tenant-login.html
│  ├─ css/
│  │  └─ styles.css
│  └─ js/
│     ├─ admin-space.js
│     ├─ admin.js
│     ├─ api.js
│     ├─ create-space.js
│     ├─ index.js
│     ├─ portal.js
│     ├─ tenant-booking.js
│     ├─ tenant-login.js
│     └─ utils.js
└─ README.md
```

## 2. Como a solução foi organizada

### Passo 1. Multi-tenant

Cada empresa possui registro em `empresas`. As demais tabelas relevantes carregam `empresa_id`:

- `usuarios`
- `servicos`
- `profissionais`
- `agendamentos`

No painel admin, o backend lê o token JWT e filtra tudo pelo `empresa_id` do usuário autenticado. Isso garante o isolamento entre tenants.

### Passo 2. Autenticação

O fluxo de autenticação fica em `backend/src/controllers/authController.js`.

- `POST /api/auth/register`: cria empresa e usuário admin
- `POST /api/auth/login`: autentica com e-mail e senha
- `GET /api/auth/me`: devolve usuário e empresa logados

### Passo 3. Serviços e profissionais

O painel administrativo permite:

- cadastrar e editar serviços
- cadastrar e editar profissionais
- definir disponibilidade semanal por profissional

A disponibilidade semanal foi armazenada como `JSONB` em `profissionais.disponibilidade`, por exemplo:

```json
{
  "1": [{ "start": "09:00", "end": "12:00" }, { "start": "13:00", "end": "18:00" }],
  "2": [{ "start": "09:00", "end": "18:00" }]
}
```

`0` representa domingo e `6` representa sábado.

### Passo 4. Regra de agendamento

O serviço de agenda usa:

- duração do serviço
- disponibilidade do profissional no dia da semana
- agendamentos já existentes no mesmo dia

O arquivo `backend/src/services/availabilityService.js` calcula:

- se o horário está dentro da faixa disponível
- se existe conflito com outro agendamento
- quais slots ainda estão livres

### Passo 5. Painel admin

A pagina `frontend/admin.html` e aberta pela rota `/espaco/:slug/admin` e oferece:

- cadastro e edição de serviços
- cadastro e edição de profissionais
- listagem de agendamentos
- edição de agendamento
- cancelamento de agendamento

### Passo 6. Pagina publica de agendamento

A pagina `frontend/tenant-booking.html`, aberta pela rota `/espaco/:slug`, permite:

- escolher serviço
- escolher profissional
- escolher data
- visualizar os horários realmente livres
- concluir o agendamento

### Passo 7. Portal e onboarding

O portal central foi separado da operacao diaria:

- `frontend/portal.html`: pagina inicial para localizar um espaco ou criar um novo
- `frontend/create-space.html`: cadastro inicial da empresa
- `frontend/tenant-login.html`: login direto no painel do tenant

## 3. Banco de dados

O schema está em [backend/src/db/schema.sql](C:/Users/sjanu/OneDrive/Área%20de%20Trabalho/WEB%20PROJECT/multi-tenant/backend/src/db/schema.sql).

Tabelas criadas:

- `empresas`
- `usuarios`
- `profissionais`
- `servicos`
- `agendamentos`

Também foram criados índices para melhorar consultas por empresa, profissional e data.

## 4. Rotas principais

### Autenticação

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Admin

- `GET /api/admin/services`
- `POST /api/admin/services`
- `PUT /api/admin/services/:id`
- `DELETE /api/admin/services/:id`
- `GET /api/admin/professionals`
- `POST /api/admin/professionals`
- `PUT /api/admin/professionals/:id`
- `PUT /api/admin/professionals/:id/availability`
- `DELETE /api/admin/professionals/:id`
- `GET /api/admin/appointments`
- `PUT /api/admin/appointments/:id`
- `PATCH /api/admin/appointments/:id/cancel`

### Público

- `GET /api/public/companies`
- `GET /api/public/companies/:slug/catalog`
- `GET /api/public/companies/:slug/availability`
- `POST /api/public/companies/:slug/appointments`

## 5. Como rodar o projeto

### Passo 1. Criar o banco MySQL

Exemplo:

```sql
CREATE DATABASE multi_tenant_agendamento CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Passo 2. Executar o schema

No terminal:

```bash
mysql -u root -p multi_tenant_agendamento < backend/src/db/schema.sql
```

### Passo 3. Configurar as variáveis de ambiente

Crie o arquivo `backend/.env` com base em `backend/.env.example`.

Exemplo:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=multi_tenant_agendamento
DB_SSL=false
JWT_SECRET=troque-esta-chave-por-uma-chave-segura
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

### Passo 4. Instalar dependências do backend

```bash
cd backend
npm install
```

### Passo 5. Iniciar o servidor

Modo desenvolvimento:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

### Passo 6. Abrir o sistema

Com o backend rodando, abra:

- `http://localhost:3000/` para o portal central
- `http://localhost:3000/criar-espaco` para criar uma nova empresa
- `http://localhost:3000/espaco/slug-da-empresa` para a agenda publica da empresa
- `http://localhost:3000/espaco/slug-da-empresa/login` para o login da empresa
- `http://localhost:3000/espaco/slug-da-empresa/admin` para o painel da empresa

O próprio Express já serve os arquivos do frontend, então você não precisa iniciar outro servidor para a interface.

## 6. Validações implementadas

- campos obrigatórios no cadastro e login
- e-mail válido
- senha mínima
- duração e preço válidos
- horário no formato `HH:MM`
- data válida
- disponibilidade semanal sem intervalos invertidos
- disponibilidade semanal sem sobreposição no mesmo dia
- bloqueio de agendamento em data passada
- bloqueio de conflito entre horários do mesmo profissional

## 7. Observações finais

- O projeto foi mantido propositalmente básico na interface, mas já funcional.
- O sistema está preparado para múltiplas empresas usando a mesma base.
- A segurança de separação depende do filtro por `empresa_id` no backend e do token JWT do usuário autenticado.
- O frontend usa apenas HTML, CSS e JavaScript puro, como pedido.

## 8. Deploy na Hostinger

Para este projeto, existem 2 caminhos viaveis:

### Opcao A. Hostinger VPS

Essa e a opcao mais simples para manter o stack exatamente como esta hoje:

- Node.js + Express rodando no servidor
- MySQL rodando no servidor
- dominio apontando para a VPS
- HTTPS configurado pela propria infraestrutura da Hostinger

Fluxo recomendado:

1. Subir o projeto para o GitHub
2. Clonar o repositorio na VPS
3. Criar o banco MySQL na VPS
4. Executar `backend/src/db/schema.sql`
5. Criar `backend/.env` com valores de producao
6. Instalar dependencias com `npm install` dentro de `backend`
7. Iniciar a aplicacao com `npm start` ou usar um gerenciador de processo como PM2

Exemplo de `.env` de producao:

```env
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
```

### Opcao B. Hostinger Node.js Web App + banco MySQL externo

Se voce quiser usar o deploy gerenciado da Hostinger para Node.js, o backend pode continuar em Node.js com um MySQL externo ou com o MySQL do proprio provedor, dependendo do plano.

Nesse caso:

- app Node.js na Hostinger
- banco MySQL em provedor externo
- `DATABASE_URL` ou `DB_HOST` apontando para esse banco externo
- `DB_SSL=true` se o provedor exigir SSL

Exemplo:

```env
PORT=3000
DATABASE_URL=mysql://USUARIO:SENHA@HOST-EXTERNO:3306/NOME_DO_BANCO
DB_SSL=true
JWT_SECRET=gere-uma-chave-longa-e-segura
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://seudominio.com,https://www.seudominio.com
```

## 9. Checklist antes de publicar

- trocar o `JWT_SECRET`
- configurar `CORS_ORIGIN` com o dominio real
- criar banco de producao
- aplicar o schema em producao
- confirmar que `backend/.env` nao vai para o Git
- testar `GET /api/health`
- testar cadastro, login e agendamento com a URL real

## 10. Fluxo recomendado para sua VPS da Hostinger

Como voce vai hospedar em VPS, este e o fluxo ideal para este projeto.

### 10.1. Preparar a VPS

Instale:

- Node.js 20 ou superior
- MySQL
- Nginx
- PM2
- Git

Exemplo:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server git
sudo npm install -g pm2
```

### 10.2. Clonar o projeto

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
cd SEU-REPOSITORIO/backend
npm install
```

### 10.3. Criar o banco

Exemplo:

```bash
sudo mysql
CREATE DATABASE multi_tenant_agendamento CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'agendamento_user'@'localhost' IDENTIFIED BY 'troque-essa-senha';
GRANT ALL PRIVILEGES ON multi_tenant_agendamento.* TO 'agendamento_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Aplicar schema:

```bash
mysql -u agendamento_user -p multi_tenant_agendamento < src/db/schema.sql
```

### 10.4. Configurar o backend

Crie `backend/.env` baseado em `backend/.env.example`.

Exemplo de producao:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=agendamento_user
DB_PASSWORD=SUA_SENHA
DB_NAME=multi_tenant_agendamento
DB_SSL=false
JWT_SECRET=gere-uma-chave-longa-e-segura
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://seudominio.com,https://www.seudominio.com
TRUST_PROXY=true
```

### 10.5. Subir com PM2

Dentro de `backend`:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

Comandos uteis:

```bash
pm2 status
pm2 logs multi-tenant-scheduler
pm2 restart multi-tenant-scheduler
```

### 10.6. Configurar o Nginx

Use o arquivo de exemplo:

- `deploy/vps/nginx-multi-tenant.conf`
- `deploy/vps/backend.env.production.example`
- `deploy/vps/first-setup.sh`
- `deploy/vps/deploy-update.sh`

Copie para o Nginx, ajuste o dominio e habilite o site.

Exemplo:

```bash
sudo cp deploy/vps/nginx-multi-tenant.conf /etc/nginx/sites-available/multi-tenant
sudo nano /etc/nginx/sites-available/multi-tenant
sudo ln -s /etc/nginx/sites-available/multi-tenant /etc/nginx/sites-enabled/multi-tenant
sudo nginx -t
sudo systemctl restart nginx
```

### 10.7. SSL

Depois de apontar o dominio para a VPS, ative HTTPS com Certbot ou pela ferramenta da propria Hostinger.

### 10.8. Teste final

Teste:

- `https://seudominio.com/api/health`
- home do portal
- criacao de espaco
- login da empresa
- painel admin
- agendamento publico

## 11. Scripts prontos para VPS

Dentro de `deploy/vps` voce ja tem arquivos de apoio:

- `first-setup.sh`: setup inicial da VPS
- `deploy-update.sh`: atualizacao de novas versoes
- `backend.env.production.example`: exemplo de ambiente de producao
- `nginx-multi-tenant.conf`: proxy reverso para o dominio

Antes de rodar o `first-setup.sh`, ajuste pelo menos:

- `REPO_URL`
- `DB_PASSWORD`
- dominio no arquivo do Nginx
