-- Switch User identity from email to phone.
-- Step 1: add new nullable phone column.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

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

-- Step 3: for users who still have no phone (e.g. admins / super admins, or
-- role users with NULL phones), seed deterministic placeholders so the
-- column can be made unique and required without losing accounts. The
-- placeholder is derived from the user id hash so it stays stable across
-- re-runs and is unique per user with overwhelming probability.
UPDATE "User"
SET "phone" = '+998' || LPAD(CAST(ABS(HASHTEXT("id")) % 1000000000 AS TEXT), 9, '0')
WHERE "phone" IS NULL;

-- Step 4: drop the old unique email column and lock down phone.
DROP INDEX IF EXISTS "User_email_key";
ALTER TABLE "User" DROP COLUMN "email";
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
