const { Client } = require('pg');
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const BASELINE_MIGRATION = '20260414104500_init_stage3_schema';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `,
    [tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function baselineIsApplied(client) {
  const migrationsTableExists = await tableExists(client, '_prisma_migrations');
  if (!migrationsTableExists) {
    return false;
  }

  const result = await client.query(
    'SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 LIMIT 1',
    [BASELINE_MIGRATION],
  );

  return result.rowCount > 0;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway.internal') ? false : undefined,
  });

  await client.connect();

  try {
    const hasExistingSchema = await tableExists(client, 'User');
    const hasBaseline = await baselineIsApplied(client);

    if (hasExistingSchema && !hasBaseline) {
      console.log(`Marking baseline migration as applied: ${BASELINE_MIGRATION}`);
      run('npx', ['prisma', 'migrate', 'resolve', '--applied', BASELINE_MIGRATION]);
    }
  } finally {
    await client.end();
  }

  console.log('Applying Prisma migrations...');
  run('npx', ['prisma', 'migrate', 'deploy']);

  console.log('Starting NestJS application...');
  run('node', ['dist/main']);
}

main().catch((error) => {
  console.error('Railway startup failed:', error);
  process.exit(1);
});

