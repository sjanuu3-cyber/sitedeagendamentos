#!/usr/bin/env bash

set -euo pipefail

APP_NAME="multi-tenant-scheduler"
APP_ROOT="/var/www/${APP_NAME}"
REPO_URL="https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git"
BRANCH="main"
DB_NAME="multi_tenant_agendamento"
DB_USER="agendamento_user"
DB_PASSWORD="troque-essa-senha"

echo "Atualizando pacotes do sistema..."
sudo apt update && sudo apt upgrade -y

echo "Instalando dependencias base..."
sudo apt install -y nginx mysql-server git curl

if ! command -v node >/dev/null 2>&1; then
  echo "Instalando Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Instalando PM2..."
  sudo npm install -g pm2
fi

if [ ! -d "${APP_ROOT}/.git" ]; then
  echo "Clonando repositorio..."
  sudo mkdir -p "$(dirname "${APP_ROOT}")"
  sudo git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_ROOT}"
  sudo chown -R "$USER:$USER" "${APP_ROOT}"
else
  echo "Repositorio ja existe em ${APP_ROOT}. Pulando clone."
fi

cd "${APP_ROOT}/backend"

echo "Instalando dependencias do backend..."
npm install

echo "Criando banco e usuario MySQL se necessario..."
sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "Aplicando schema..."
mysql -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" < src/db/schema.sql

if [ ! -f ".env" ]; then
  echo "Criando .env inicial a partir do exemplo..."
  cp .env.example .env
  echo "Arquivo backend/.env criado. Edite os valores antes de abrir o sistema ao publico."
else
  echo "Arquivo backend/.env ja existe. Pulando criacao."
fi

echo "Subindo aplicacao com PM2..."
pm2 start ecosystem.config.js --env production
pm2 save

echo
echo "Setup inicial concluido."
echo "Proximos passos:"
echo "1. Edite ${APP_ROOT}/backend/.env"
echo "2. Configure o Nginx com deploy/vps/nginx-multi-tenant.conf"
echo "3. Aponte o dominio e ative SSL"
