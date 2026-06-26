<div align="center">

<img src="https://img.shields.io/badge/NestJS-11.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white"/>
<img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/Prisma-5.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white"/>
<img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white"/>
<img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>

# 🎓 MathCenter Backend

### REST API для платформы онлайн-обучения математике

*Масштабируемый бэкенд с JWT-аутентификацией, очередями задач, генерацией PDF/Excel и Telegram-ботом*

[Документация API (Swagger)](#) • [Сообщить об ошибке](https://github.com/SayfullakhonovKomilkhon/Math_lms_nest.js/issues)

</div>

---

## ✨ Возможности

| Функция | Описание |
|---|---|
| 🔐 **JWT Auth** | Аутентификация через Passport.js + JWT с refresh-токенами |
| 📚 **Курсы и уроки** | Полное управление учебным контентом |
| 📊 **Отчёты** | Генерация Excel-отчётов через ExcelJS и PDF через PDFKit |
| 📬 **Очереди задач** | Асинхронная обработка через BullMQ + Redis |
| 🤖 **Telegram-бот** | Уведомления и управление через Telegraf |
| ☁️ **S3-хранилище** | Загрузка файлов через AWS SDK |
| 🛡️ **Rate Limiting** | Защита API от перегрузок через @nestjs/throttler |
| 📖 **Swagger UI** | Автодокументация всех эндпоинтов |
| ⏰ **Планировщик** | Крон-задачи через @nestjs/schedule |

---

## 🚀 Быстрый старт

### Требования

- Node.js >= 18
- Docker & Docker Compose
- PostgreSQL 15
- Redis 7

### Установка

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/SayfullakhonovKomilkhon/Math_lms_nest.js.git
cd Math_lms_nest.js

# 2. Установите зависимости
npm install

# 3. Настройте окружение
cp .env.example .env
# Отредактируйте .env, указав параметры БД и Redis
```

### Запуск через Docker

```bash
# Запустить PostgreSQL + Redis в контейнерах
npm run db:docker

# Применить миграции и сидировать БД
npm run db:push
npm run db:seed
```

### Запуск сервера

```bash
# Режим разработки (hot-reload)
npm run start:dev

# Продакшн
npm run build && npm run start:prod
```

API будет доступен на: `http://localhost:3000`  
Swagger UI: `http://localhost:3000/api`

---

## 🛠️ Технологический стек

| Слой | Технология |
|---|---|
| **Фреймворк** | NestJS 11.x |
| **Язык** | TypeScript 5.x |
| **ORM** | Prisma 5.x |
| **База данных** | PostgreSQL 15 |
| **Кэш / Очереди** | Redis + BullMQ |
| **Аутентификация** | Passport.js + JWT |
| **Файловое хранилище** | AWS S3 |
| **Документация** | Swagger / OpenAPI |
| **Бот** | Telegraf (Telegram) |
| **Отчёты** | ExcelJS + PDFKit |
| **Контейнеризация** | Docker + Docker Compose |

---

## 🏗️ Архитектура проекта

```
src/
├── auth/           # JWT аутентификация и авторизация
├── users/          # Управление пользователями
├── courses/        # Курсы и учебные материалы
├── lessons/        # Уроки и задания
├── payments/       # Платёжная логика
├── reports/        # Генерация PDF/Excel отчётов
├── notifications/  # Telegram-бот + уведомления
├── queue/          # BullMQ очереди задач
├── storage/        # Загрузка файлов в S3
└── common/         # Общие утилиты, Guards, Pipes

prisma/
├── schema.prisma   # Схема базы данных
├── migrations/     # История миграций
└── seed.ts         # Начальные данные

scripts/
├── db-prepare.js       # Подготовка БД
├── railway-start.js    # Старт на Railway
└── prisma-generate.js  # Генерация Prisma Client
```

---

## 🔑 Переменные окружения

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `REDIS_URL` | Строка подключения к Redis |
| `JWT_SECRET` | Секретный ключ для JWT |
| `JWT_REFRESH_SECRET` | Секрет для refresh-токенов |
| `AWS_ACCESS_KEY_ID` | Ключ доступа AWS S3 |
| `AWS_SECRET_ACCESS_KEY` | Секретный ключ AWS S3 |
| `AWS_S3_BUCKET` | Имя S3-бакета |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота |

---

## 🧪 Тестирование

```bash
# Unit-тесты
npm run test

# E2E тесты
npm run test:e2e

# Покрытие кода
npm run test:cov
```

---

## 🐳 Docker Деплой

```bash
# Продакшн сборка
docker compose -f docker-compose.prod.yml up -d

# Применить миграции в продакшне
npm run db:migrate:deploy
```

---

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте ветку: `git checkout -b feature/your-feature`
3. Сделайте коммит: `git commit -m 'feat: add your feature'`
4. Запушьте: `git push origin feature/your-feature`
5. Откройте Pull Request

---

<div align="center">

Часть проекта **MathCenter LMS** · Backend API · Powered by [NestJS](https://nestjs.com/)

</div>
