ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SALES_MANAGER';

CREATE TYPE "ApplicationStatus" AS ENUM (
  'NEW',
  'IN_PROGRESS',
  'NO_ANSWER',
  'INTERESTED',
  'TRIAL_SCHEDULED',
  'ENROLLED',
  'REJECTED'
);

CREATE TYPE "ApplicationActivityType" AS ENUM (
  'COMMENT',
  'STATUS_CHANGE',
  'CALLBACK',
  'ASSIGNMENT'
);

ALTER TABLE "User" ADD COLUMN "fullName" TEXT;

ALTER TABLE "AdmissionApplication"
  ADD COLUMN "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "assignedToId" TEXT,
  ADD COLUMN "nextCallAt" TIMESTAMP(3),
  ADD COLUMN "lastContactAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "ApplicationActivity" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "type" "ApplicationActivityType" NOT NULL,
  "note" TEXT,
  "fromStatus" "ApplicationStatus",
  "toStatus" "ApplicationStatus",
  "nextCallAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApplicationActivity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdmissionApplication"
  ADD CONSTRAINT "AdmissionApplication_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApplicationActivity"
  ADD CONSTRAINT "ApplicationActivity_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApplicationActivity"
  ADD CONSTRAINT "ApplicationActivity_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "AdmissionApplication_assignedToId_status_idx"
  ON "AdmissionApplication"("assignedToId", "status");

CREATE INDEX "AdmissionApplication_nextCallAt_idx"
  ON "AdmissionApplication"("nextCallAt");

CREATE INDEX "ApplicationActivity_applicationId_createdAt_idx"
  ON "ApplicationActivity"("applicationId", "createdAt");

CREATE INDEX "ApplicationActivity_actorId_idx"
  ON "ApplicationActivity"("actorId");
