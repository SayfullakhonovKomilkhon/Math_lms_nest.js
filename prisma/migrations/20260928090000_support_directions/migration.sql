-- CreateEnum
CREATE TYPE "SupportDirectionStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SupportDirection" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "status" "SupportDirectionStatus" NOT NULL DEFAULT 'NEW',
    "result" TEXT NOT NULL DEFAULT '',
    "outcome" "SupportOutcome",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportDirection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportDirection_teacherId_status_idx" ON "SupportDirection"("teacherId", "status");

-- CreateIndex
CREATE INDEX "SupportDirection_referrerId_createdAt_idx" ON "SupportDirection"("referrerId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportDirection_feedbackId_idx" ON "SupportDirection"("feedbackId");

-- AddForeignKey
ALTER TABLE "SupportDirection" ADD CONSTRAINT "SupportDirection_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "LessonFeedback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportDirection" ADD CONSTRAINT "SupportDirection_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportDirection" ADD CONSTRAINT "SupportDirection_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE UNIQUE INDEX "SupportDirection_active_feedback_key" ON "SupportDirection" ("feedbackId") WHERE "status" IN ('NEW', 'IN_PROGRESS');
