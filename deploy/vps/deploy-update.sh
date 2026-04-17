#!/usr/bin/env bash

set -euo pipefail

APP_NAME="multi-tenant-scheduler"
APP_ROOT="/var/www/${APP_NAME}"
BRANCH="main"

cd "${APP_ROOT}"

echo "Atualizando codigo..."
git fetch origin
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

echo "Instalando dependencias do backend..."
cd "${APP_ROOT}/backend"
npm install

echo "Reiniciando aplicacao..."
pm2 restart "${APP_NAME}" || pm2 start ecosystem.config.js --env production
pm2 save

echo "Deploy concluido."
