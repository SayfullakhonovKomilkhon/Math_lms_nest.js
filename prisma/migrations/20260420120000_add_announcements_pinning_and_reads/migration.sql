-- AlterTable: расширяем Announcement
ALTER TABLE "Announcement"
  ALTER COLUMN "message" TYPE TEXT,
  ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Announcement_groupId_createdAt_idx" ON "Announcement"("groupId", "createdAt");

-- CreateTable
CREATE TABLE "AnnouncementRead" (
  "id" TEXT NOT NULL,
  "announcementId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_announcementId_userId_key"
  ON "AnnouncementRead"("announcementId", "userId");

CREATE INDEX "AnnouncementRead_userId_idx" ON "AnnouncementRead"("userId");

-- AddForeignKey
ALTER TABLE "AnnouncementRead"
  ADD CONSTRAINT "AnnouncementRead_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnnouncementRead"
  ADD CONSTRAINT "AnnouncementRead_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
