-- CreateEnum
CREATE TYPE "LessonUnderstanding" AS ENUM ('UNDERSTOOD', 'PRACTICE', 'NEEDS_HELP', 'ABSENT');

-- CreateEnum
CREATE TYPE "SupportBookingStatus" AS ENUM ('BOOKED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupportOutcome" AS ENUM ('RESOLVED', 'NEEDS_MORE');

-- CreateTable
CREATE TABLE "LessonFeedback" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "topic" TEXT NOT NULL,
    "understanding" "LessonUnderstanding" NOT NULL,
    "comment" TEXT NOT NULL,
    "privateNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportAvailability" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "capacity" INTEGER NOT NULL DEFAULT 6,
    "location" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SupportAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTimeOff" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "SupportTimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSession" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportBooking" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "status" "SupportBookingStatus" NOT NULL DEFAULT 'BOOKED',
    "outcome" "SupportOutcome",
    "result" TEXT NOT NULL DEFAULT '',
    "changeReason" TEXT NOT NULL DEFAULT '',
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportPushOutbox" (
    "id" TEXT NOT NULL,
    "userIds" TEXT[],
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportPushOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonFeedback_studentId_date_idx" ON "LessonFeedback"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LessonFeedback_groupId_studentId_date_key" ON "LessonFeedback"("groupId", "studentId", "date");

-- CreateIndex
CREATE INDEX "SupportAvailability_teacherId_idx" ON "SupportAvailability"("teacherId");

-- CreateIndex
CREATE INDEX "SupportTimeOff_teacherId_startAt_idx" ON "SupportTimeOff"("teacherId", "startAt");

-- CreateIndex
CREATE INDEX "SupportSession_startAt_idx" ON "SupportSession"("startAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportSession_teacherId_startAt_key" ON "SupportSession"("teacherId", "startAt");

-- CreateIndex
CREATE INDEX "SupportBooking_studentId_status_idx" ON "SupportBooking"("studentId", "status");

-- CreateIndex
CREATE INDEX "SupportBooking_sessionId_status_idx" ON "SupportBooking"("sessionId", "status");

-- CreateIndex
CREATE INDEX "SupportBooking_referrerId_createdAt_idx" ON "SupportBooking"("referrerId", "createdAt");

-- AddForeignKey
ALTER TABLE "LessonFeedback" ADD CONSTRAINT "LessonFeedback_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonFeedback" ADD CONSTRAINT "LessonFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonFeedback" ADD CONSTRAINT "LessonFeedback_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportAvailability" ADD CONSTRAINT "SupportAvailability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTimeOff" ADD CONSTRAINT "SupportTimeOff_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportBooking" ADD CONSTRAINT "SupportBooking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SupportSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportBooking" ADD CONSTRAINT "SupportBooking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportBooking" ADD CONSTRAINT "SupportBooking_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "LessonFeedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportBooking" ADD CONSTRAINT "SupportBooking_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

