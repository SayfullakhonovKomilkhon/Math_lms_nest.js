ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONTENT_MANAGER';

CREATE TABLE "SiteContent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "updatedById" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteContentRevision" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteContentRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteContent_key_key" ON "SiteContent"("key");
CREATE INDEX "SiteContentRevision_contentId_createdAt_idx" ON "SiteContentRevision"("contentId", "createdAt");

ALTER TABLE "SiteContentRevision"
ADD CONSTRAINT "SiteContentRevision_contentId_fkey"
FOREIGN KEY ("contentId") REFERENCES "SiteContent"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
