-- Convert Parent <-> Student from a strict 1:1 relation into a proper
-- many-to-many through a ParentStudent join table. Pre-existing 1:1
-- links are preserved by copying Parent.studentId rows into the join
-- table, after which Parent.studentId is dropped.
-- Idempotent so it is safe to re-run.

CREATE TABLE IF NOT EXISTS "ParentStudent" (
  "parentId"  TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("parentId", "studentId")
);

CREATE INDEX IF NOT EXISTS "ParentStudent_studentId_idx"
  ON "ParentStudent"("studentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='ParentStudent'
      AND constraint_name='ParentStudent_parentId_fkey'
  ) THEN
    ALTER TABLE "ParentStudent"
      ADD CONSTRAINT "ParentStudent_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "Parent"("id")
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public'
      AND table_name='ParentStudent'
      AND constraint_name='ParentStudent_studentId_fkey'
  ) THEN
    ALTER TABLE "ParentStudent"
      ADD CONSTRAINT "ParentStudent_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "Student"("id")
      ON DELETE CASCADE;
  END IF;
END $$;

-- Migrate existing 1:1 links and drop the legacy column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='Parent'
      AND column_name='studentId'
  ) THEN
    INSERT INTO "ParentStudent" ("parentId", "studentId", "createdAt")
    SELECT "id", "studentId", "createdAt"
    FROM "Parent"
    WHERE "studentId" IS NOT NULL
    ON CONFLICT DO NOTHING;

    ALTER TABLE "Parent" DROP CONSTRAINT IF EXISTS "Parent_studentId_key";
    ALTER TABLE "Parent" DROP CONSTRAINT IF EXISTS "Parent_studentId_fkey";
    ALTER TABLE "Parent" DROP COLUMN "studentId";
  END IF;
END $$;
