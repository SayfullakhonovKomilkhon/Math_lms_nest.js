-- Create the Setting table if it does not already exist.
-- The Setting Prisma model was added without an accompanying CREATE TABLE
-- migration, which causes `prisma.setting.upsert()` to fail in environments
-- where the table was never provisioned (e.g. Railway production).

CREATE TABLE IF NOT EXISTS "Setting" (
  "id"        TEXT NOT NULL,
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "label"     TEXT,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key");
