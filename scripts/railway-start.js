const { Client } = require('pg');
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const BASELINE_MIGRATION = '20260414104500_init_stage3_schema';
const FAILED_MIGRATION_TO_HOTFIX = '20260416120000_add_achievement_unique_and_setting_key';

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

async function hasFailedMigration(client, migrationName) {
  const migrationsTableExists = await tableExists(client, '_prisma_migrations');
  if (!migrationsTableExists) {
    return false;
  }

  const result = await client.query(
    `
      SELECT 1
      FROM "_prisma_migrations"
      WHERE migration_name = $1
        AND rolled_back_at IS NULL
        AND finished_at IS NULL
      LIMIT 1
    `,
    [migrationName],
  );

  return result.rowCount > 0;
}

async function hotfixFailedAchievementUniqueMigration(client) {
  // This migration could fail on real data because SPECIAL achievements use month=0 (not NULL),
  // so the original dedupe query didn't remove duplicates before creating the unique index.
  //
  // If a deploy fails mid-migration, Prisma records it as failed (P3009) and stores a checksum for the
  // migration SQL that was attempted. Re-running edited SQL from the same migration id can be risky,
  // so for *failed* attempts we apply the corrected DDL here and then `migrate resolve --applied`.
  await client.query('BEGIN');
  try {
    await client.query(`
      WITH ranked AS (
        SELECT
          ctid,
          ROW_NUMBER() OVER (
            PARTITION BY "studentId", "type", "month", "year"
            ORDER BY "createdAt" DESC, "id" DESC
          ) AS row_num
        FROM "Achievement"
      )
      DELETE FROM "Achievement"
      WHERE ctid IN (
        SELECT ctid
        FROM ranked
        WHERE row_num > 1
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_studentId_type_month_year_key"
      ON "Achievement"("studentId", "type", "month", "year");
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'Setting'
        ) THEN
          EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key")';
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
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

    if (await hasFailedMigration(client, FAILED_MIGRATION_TO_HOTFIX)) {
      console.log(`Hotfixing failed migration: ${FAILED_MIGRATION_TO_HOTFIX}`);
      await hotfixFailedAchievementUniqueMigration(client);
      console.log(`Marking migration as applied (manual hotfix): ${FAILED_MIGRATION_TO_HOTFIX}`);
      run('npx', ['prisma', 'migrate', 'resolve', '--applied', FAILED_MIGRATION_TO_HOTFIX]);
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

