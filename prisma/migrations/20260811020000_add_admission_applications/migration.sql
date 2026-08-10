CREATE TABLE IF NOT EXISTS "AdmissionApplication" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "childAge" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdmissionApplication_createdAt_idx"
  ON "AdmissionApplication"("createdAt");

CREATE INDEX IF NOT EXISTS "AdmissionApplication_phone_idx"
  ON "AdmissionApplication"("phone");
