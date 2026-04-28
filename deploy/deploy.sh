#!/usr/bin/env bash
# Скрипт быстрого деплоя production-стека на сервере.
#
# Что делает:
#   1. git pull (тянет свежие изменения)
#   2. собирает свежий образ API
#   3. перезапускает только то, что изменилось (без даунтайма Postgres/Redis/Caddy)
#   4. показывает статус контейнеров и последние логи API
#
# Запуск:
#   cd /opt/mathcenter-backend
#   ./deploy/deploy.sh
#
# Требования:
#   - Запускать под пользователем `deploy` с правами docker.
#   - .env.production должен существовать рядом с docker-compose.prod.yml.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env.production ]]; then
	echo "❌ .env.production не найден. Скопируйте из .env.production.example и заполните."
	exit 1
fi

echo "==> Pulling latest from git..."
git pull --ff-only

echo "==> Building API image..."
docker compose -f docker-compose.prod.yml --env-file .env.production build api

echo "==> Applying changes (rolling update)..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --remove-orphans

echo ""
echo "==> Container status:"
docker compose -f docker-compose.prod.yml --env-file .env.production ps

echo ""
echo "==> Recent API logs (last 30 lines):"
docker compose -f docker-compose.prod.yml --env-file .env.production logs api --tail=30

echo ""
echo "✅ Deploy finished. Чтобы посмотреть live-логи:"
echo "   docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api"
