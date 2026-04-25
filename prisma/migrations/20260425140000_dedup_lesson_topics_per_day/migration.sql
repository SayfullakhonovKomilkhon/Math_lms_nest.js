-- Deduplicate LessonTopic rows so that each (groupId, day) keeps only the
-- most recently created entry. Older duplicates are removed. This makes the
-- existing data consistent with the new "one topic per day per group" rule
-- enforced in the application layer (LessonTopicsService.create now upserts).

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "groupId", DATE_TRUNC('day', "date")
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "LessonTopic"
)
DELETE FROM "LessonTopic"
WHERE "id" IN (
  SELECT "id" FROM ranked WHERE rn > 1
);

-- Helpful index for the per-day lookup we now do on every upsert.
CREATE INDEX IF NOT EXISTS "LessonTopic_groupId_date_idx"
  ON "LessonTopic" ("groupId", "date");
