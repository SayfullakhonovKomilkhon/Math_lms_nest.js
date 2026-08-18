ALTER TABLE "AdmissionApplication"
  ADD COLUMN "parentFullName" TEXT,
  ADD COLUMN "parentPhone" TEXT;

CREATE INDEX "AdmissionApplication_parentPhone_idx"
  ON "AdmissionApplication"("parentPhone");
