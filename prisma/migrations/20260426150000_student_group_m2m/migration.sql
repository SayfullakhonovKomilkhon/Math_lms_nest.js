-- Convert Student <-> Group from a 1:N relation (Student.groupId) into a
-- proper many-to-many through a StudentGroup join table that also stores
-- a per-link monthlyFee. The legacy Student.monthlyFee + Student.groupId
-- columns are migrated in (one row per existing student that already has
-- a group) and then dropped.
-- Idempotent so the migration is safe to re-run on partially upgraded
-- databases (e.g. Railway hot-fixes).

CREATE TABLE IF NOT EXISTS "StudentGroup" (
  "id"         TEXT NOT NULL,
  "studentId"  TEXT NOT NULL,
  "groupId"    TEXT NOT NULL,
  "monthlyFee" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "joinedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentGroup_studentId_groupId_key"
  ON "StudentGroup"("studentId", "groupId");
CREATE INDEX IF NOT EXISTS "StudentGroup_studentId_idx"
  ON "StudentGroup"("studentId");
CREATE INDEX IF NOT EXISTS "StudentGroup_groupId_idx"
  ON "StudentGroup"("groupId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='StudentGroup'
      AND constraint_name='StudentGroup_studentId_fkey'
  ) THEN
    ALTER TABLE "StudentGroup"
      ADD CONSTRAINT "StudentGroup_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "Student"("id")
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='StudentGroup'
      AND constraint_name='StudentGroup_groupId_fkey'
  ) THEN
    ALTER TABLE "StudentGroup"
      ADD CONSTRAINT "StudentGroup_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "Group"("id")
      ON DELETE CASCADE;
  END IF;
END $$;

-- Backfill: copy existing primary group + fee into the new join table.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='Student'
      AND column_name='groupId'
  ) THEN
    -- Deterministic id keeps the migration idempotent without relying on
    -- pgcrypto/uuid extensions.
    INSERT INTO "StudentGroup" ("id", "studentId", "groupId", "monthlyFee", "joinedAt")
    SELECT
      'sg_' || s."id" || '_' || s."groupId",
      s."id",
      s."groupId",
      COALESCE(s."monthlyFee", 0),
      s."enrolledAt"
    FROM "Student" s
    WHERE s."groupId" IS NOT NULL
    ON CONFLICT ("studentId", "groupId") DO NOTHING;
  END IF;
END $$;

-- Drop the legacy Student.groupId / Student.monthlyFee columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='Student'
      AND column_name='groupId'
  ) THEN
    ALTER TABLE "Student" DROP CONSTRAINT IF EXISTS "Student_groupId_fkey";
    DROP INDEX IF EXISTS "Student_groupId_idx";
    ALTER TABLE "Student" DROP COLUMN "groupId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='Student'
      AND column_name='monthlyFee'
  ) THEN
    ALTER TABLE "Student" DROP COLUMN "monthlyFee";
  END IF;
END $$;
