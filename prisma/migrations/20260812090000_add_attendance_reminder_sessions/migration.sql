CREATE TABLE "AttendanceReminderSession" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "scheduledStart" TIMESTAMP(3) NOT NULL,
  "scheduledEnd" TIMESTAMP(3) NOT NULL,
  "expectedStudentIds" TEXT[],
  "nextReminderAt" TIMESTAMP(3) NOT NULL,
  "lastReminderAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AttendanceReminderSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceReminderSession_groupId_scheduledStart_key"
  ON "AttendanceReminderSession"("groupId", "scheduledStart");

CREATE INDEX "AttendanceReminderSession_completedAt_nextReminderAt_idx"
  ON "AttendanceReminderSession"("completedAt", "nextReminderAt");

ALTER TABLE "AttendanceReminderSession"
  ADD CONSTRAINT "AttendanceReminderSession_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
