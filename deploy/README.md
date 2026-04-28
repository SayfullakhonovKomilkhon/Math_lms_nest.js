# Production Deployment Guide

Деплой backend на DigitalOcean Droplet (Ubuntu 24.04+) с Docker, Caddy и
автоматическим HTTPS.

## Архитектура

```
                 Интернет (порты 80, 443)
                         │
                         ▼
            ┌─────────────────────────┐
            │   Caddy (reverse proxy) │  ◄── Let's Encrypt SSL
            │   ports: 80, 443        │
            └────────────┬────────────┘
                         │ внутренняя сеть `backend`
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │  API   │ │Postgres│ │ Redis  │
         │ :3000  │ │ :5432  │ │ :6379  │
         └────────┘ └────────┘ └────────┘
```

Только **Caddy** виден из интернета. Postgres, Redis и API изолированы во
внутренней Docker-сети — к ним нельзя подключиться снаружи.

## Первичная настройка сервера

Описана в чате (Фазы 1–5): обновление пакетов, swap, пользователь `deploy`,
UFW, Docker. Если ставите с нуля на новом сервере — повторите эти шаги.

## Первый деплой

```bash
# 1. Заходим на сервер под deploy
ssh deploy@165.22.54.226

# 2. Клонируем репо в /opt
sudo mkdir -p /opt && sudo chown deploy:deploy /opt
cd /opt
git clone https://github.com/SayfullakhonovKomilkhon/Math_lms_nest.js.git mathcenter-backend
cd mathcenter-backend

# 3. Создаём .env.production из шаблона
cp .env.production.example .env.production

# 4. Генерируем сильные секреты
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-32)"
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')"

# Запишите эти значения в .env.production:
nano .env.production

# Также скопируйте из Railway:
#   - TELEGRAM_BOT_TOKEN (если есть)
#   - S3_* (если уже настроен — иначе заглушки)
#   - FRONTEND_URL (https://khanovmathacademy.uz,https://www.khanovmathacademy.uz)

# 5. Запускаем стек
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# 6. Смотрим логи API
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api

# 7. Проверяем что работает (когда DNS пропагнётся)
curl https://api.khanovmathacademy.uz/health
```

## Последующие деплои

Просто запустите `./deploy/deploy.sh` — он сделает `git pull`, пересоберёт
API-образ и применит изменения без даунтайма Postgres/Redis.

```bash
cd /opt/mathcenter-backend
./deploy/deploy.sh
```

## Полезные команды

```bash
# Статус всех контейнеров
docker compose -f docker-compose.prod.yml ps

# Логи в реальном времени
docker compose -f docker-compose.prod.yml logs -f api      # только API
docker compose -f docker-compose.prod.yml logs -f          # все сервисы

# Перезапуск только API (Postgres/Redis не трогаем)
docker compose -f docker-compose.prod.yml restart api

# Войти в контейнер для отладки
docker compose -f docker-compose.prod.yml exec api sh

# Дамп базы (для резервной копии)
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U mathcenter mathcenter > backup-$(date +%Y%m%d).sql

# Восстановление из дампа
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U mathcenter mathcenter

# Применить миграции вручную (обычно делается на старте через railway-start.js)
docker compose -f docker-compose.prod.yml exec api \
  npx prisma migrate deploy

# Полный рестарт (с пересборкой)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Остановить всё
docker compose -f docker-compose.prod.yml down

# Остановить и удалить volume'ы (УНИЧТОЖИТ ВСЕ ДАННЫЕ)
docker compose -f docker-compose.prod.yml down -v
```

## Бэкапы

Поставьте cron на ежедневный дамп БД:

```bash
crontab -e
```

Добавьте строку (каждый день в 03:00 по Ташкенту):

```cron
0 3 * * * cd /opt/mathcenter-backend && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U mathcenter mathcenter | gzip > /opt/backups/mathcenter-$(date +\%Y\%m\%d).sql.gz
```

И не забудьте создать папку:

```bash
mkdir -p /opt/backups
```

Раз в неделю копируйте бэкапы куда-то наружу (DigitalOcean Spaces, S3, Backblaze)
чтобы не потерять при сбое сервера.

## Troubleshooting

### API не стартует, логи показывают `connect ECONNREFUSED ... 5432`

Postgres ещё не готов. Проверьте:
```bash
docker compose -f docker-compose.prod.yml ps
```

Если postgres `(healthy)` — попробуйте `restart api`. Если `(starting)` —
подождите 30 сек.

### `port is already allocated` (порт 80/443 занят)

На сервере уже что-то слушает на 80/443. Найдите и остановите:
```bash
sudo lsof -i :80
sudo lsof -i :443
sudo systemctl stop apache2 nginx 2>/dev/null
```

### Caddy не получает SSL-сертификат

Проверьте:
1. DNS записан правильно (`dig +short api.khanovmathacademy.uz` → IP сервера)
2. Порты 80 и 443 открыты в UFW (`sudo ufw status`)
3. Логи Caddy: `docker compose -f docker-compose.prod.yml logs caddy`

Let's Encrypt имеет лимит 5 попыток в час на один домен — при ошибке подождите.

### Закончилось место на диске

```bash
df -h               # сколько свободно
docker system df    # сколько занимает Docker
docker system prune -af --volumes   # ОСТОРОЖНО: удалит неиспользуемые volume'ы
```
