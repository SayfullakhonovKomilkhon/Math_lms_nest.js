-- Switch User identity from email to phone.
-- This migration is idempotent / re-runnable: every step guards against
-- partial prior state so a previously failed attempt can be resumed safely.

-- Step 1: add the new nullable phone column (no-op if it already exists).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Step 2: backfill phone from related role tables when available.
UPDATE "User" u
SET "phone" = s."phone"
FROM "Student" s
WHERE s."userId" = u."id" AND s."phone" IS NOT NULL AND u."phone" IS NULL;

UPDATE "User" u
SET "phone" = t."phone"
FROM "Teacher" t
WHERE t."userId" = u."id" AND t."phone" IS NOT NULL AND u."phone" IS NULL;

UPDATE "User" u
SET "phone" = p."phone"
FROM "Parent" p
WHERE p."userId" = u."id" AND p."phone" IS NOT NULL AND u."phone" IS NULL;

-- Step 3: seed a deterministic placeholder for users with no phone yet
-- (admins / super admins, or role users where the phone column was NULL).
-- The id is mixed into the hash so each user gets a unique placeholder.
UPDATE "User"
SET "phone" = '+998' || LPAD(CAST(ABS(HASHTEXT("id")) % 1000000000 AS TEXT), 9, '0')
WHERE "phone" IS NULL;

-- Step 4: resolve any duplicate phones (real duplicates between Student /
-- Teacher / Parent rows AND extremely rare hash collisions on the placeholder
-- above) by suffixing later rows with -2, -3, ... so the unique index in
-- step 5 can be created. We deterministically keep the oldest user's phone
-- intact and rewrite later ones.
WITH ranked AS (
  SELECT "id",
         "phone",
         ROW_NUMBER() OVER (PARTITION BY "phone" ORDER BY "createdAt", "id") AS rn
    FROM "User"
)
UPDATE "User" u
   SET "phone" = u."phone" || '-' || ranked.rn
  FROM ranked
 WHERE ranked."id" = u."id" AND ranked.rn > 1;

-- Step 5: drop the old email artefacts and lock the new phone column down.
DROP INDEX IF EXISTS "User_email_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "email";
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;
DROP INDEX IF EXISTS "User_phone_key";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
