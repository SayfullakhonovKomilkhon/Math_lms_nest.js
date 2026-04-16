-- Remove duplicate monthly achievements before adding the unique index.
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY "studentId", "type", "month", "year"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS row_num
  FROM "Achievement"
  WHERE "month" IS NOT NULL AND "year" IS NOT NULL
)
DELETE FROM "Achievement"
WHERE ctid IN (
  SELECT ctid
  FROM ranked
  WHERE row_num > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_studentId_type_month_year_key"
ON "Achievement"("studentId", "type", "month", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key"
ON "Setting"("key");

