-- Remove duplicates for the composite unique Prisma expects on Achievement.
-- IMPORTANT: SPECIAL achievements store `month` as 0 (not NULL), so we must dedupe all rows.
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

CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_studentId_type_month_year_key"
ON "Achievement"("studentId", "type", "month", "year");

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

