/**
 * Поднимает Postgres через Docker (если доступен) и выполняет prisma db push + seed.
 * Без Docker выводит инструкции для локального PostgreSQL (macOS / Homebrew).
 */

const { spawnSync, execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

function run(cmd, args = [], inherit = true) {
  return spawnSync(cmd, args, {
    cwd: root,
    stdio: inherit ? 'inherit' : 'pipe',
    encoding: 'utf8',
  });
}

function sleepSync(seconds) {
  try {
    if (process.platform === 'win32') {
      execSync(`powershell -NoProfile -Command "Start-Sleep -Seconds ${seconds}"`, {
        stdio: 'ignore',
      });
    } else {
      execSync(`sleep ${seconds}`, { stdio: 'ignore' });
    }
  } catch {
    /* ignore */
  }
}

function hasDockerCLI() {
  const r = run('docker', ['version'], false);
  return r.status === 0;
}

function printNoDockerHelp() {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('Команда `docker` не найдена или Docker не запущен.');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.error('Вариант A — установить Docker Desktop (удобно с docker-compose):\n');
  console.error('  https://www.docker.com/products/docker-desktop/\n');
  console.error('  Затем: npm run db:prepare\n');
  console.error('Вариант B — PostgreSQL без Docker (macOS, Homebrew):\n');
  console.error('  brew install postgresql@16');
  console.error('  brew services start postgresql@16\n');
  console.error('  Создайте пользователя и БД (подставьте свой пароль):\n');
  console.error('  createuser mathcenter --pwprompt   # или используйте существующего юзера');
  console.error('  createdb -O mathcenter mathcenter\n');
  console.error('  В .env укажите, например:');
  console.error(
    '  DATABASE_URL="postgresql://mathcenter:ВАШ_ПАРОЛЬ@127.0.0.1:5432/mathcenter?schema=public"\n',
  );
  console.error('Вариант C — Postgres.app: https://postgresapp.com/\n');
  console.error('После того как `localhost:5432` отвечает:\n');
  console.error('  npx prisma db push');
  console.error('  npx prisma db seed\n');
}

function waitForPostgres(maxAttempts = 40, delaySec = 2) {
  for (let i = 0; i < maxAttempts; i++) {
    const r = run(
      'docker',
      ['compose', 'exec', '-T', 'postgres', 'pg_isready', '-U', 'mathcenter', '-d', 'mathcenter'],
      false,
    );
    if (r.status === 0) {
      return true;
    }
    sleepSync(delaySec);
  }
  return false;
}

function main() {
  if (!hasDockerCLI()) {
    printNoDockerHelp();
    process.exit(1);
  }

  console.log('Запуск PostgreSQL (docker compose up -d)...\n');
  const up = run('docker', ['compose', 'up', '-d']);
  if (up.status !== 0) {
    console.error('\nНе удалось выполнить docker compose up -d.');
    console.error('Проверьте, что Docker Desktop запущен.\n');
    process.exit(1);
  }

  console.log('\nОжидание готовности Postgres...\n');
  if (!waitForPostgres()) {
    console.error('Таймаут: контейнер Postgres не стал готов за отведённое время.');
    console.error('Проверьте: docker compose ps && docker compose logs postgres\n');
    process.exit(1);
  }

  console.log('\nПрименение схемы (prisma db push)...\n');
  const push = spawnSync('npx prisma db push', {
    cwd: root,
    shell: true,
    stdio: 'inherit',
  });
  if (push.status !== 0) {
    process.exit(push.status ?? 1);
  }

  console.log('\nЗаполнение данными (prisma db seed)...\n');
  const seed = spawnSync('npx prisma db seed', {
    cwd: root,
    shell: true,
    stdio: 'inherit',
  });
  process.exit(seed.status ?? 0);
}

main();
