CREATE TYPE "ApplicationSource" AS ENUM (
  'WEBSITE',
  'ADVERTISEMENT',
  'INSTAGRAM',
  'TELEGRAM',
  'PHONE_CALL',
  'WALK_IN',
  'REFERRAL',
  'OTHER'
);

ALTER TABLE "AdmissionApplication"
  ADD COLUMN "source" "ApplicationSource" NOT NULL DEFAULT 'WEBSITE',
  ADD COLUMN "sourceDetails" TEXT;

CREATE INDEX "AdmissionApplication_source_idx"
  ON "AdmissionApplication"("source");
