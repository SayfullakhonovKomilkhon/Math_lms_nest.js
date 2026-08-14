import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const HOMEPAGE_KEY = 'homepage';
const MAX_CONTENT_BYTES = 250_000;

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicHomepage() {
    const record = await this.prisma.siteContent.findUnique({
      where: { key: HOMEPAGE_KEY },
      select: { published: true, publishedAt: true, updatedAt: true },
    });

    return {
      content: record?.published ?? null,
      publishedAt: record?.publishedAt ?? null,
      updatedAt: record?.updatedAt ?? null,
    };
  }

  async getHomepageEditor() {
    const record = await this.prisma.siteContent.findUnique({
      where: { key: HOMEPAGE_KEY },
      select: {
        id: true,
        draft: true,
        published: true,
        updatedById: true,
        publishedById: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return (
      record ?? {
        id: null,
        draft: {},
        published: null,
        updatedById: null,
        publishedById: null,
        publishedAt: null,
        createdAt: null,
        updatedAt: null,
      }
    );
  }

  async saveHomepageDraft(
    rawContent: Record<string, unknown>,
    actorId: string,
  ) {
    const content = this.validateContent(rawContent);

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.siteContent.upsert({
        where: { key: HOMEPAGE_KEY },
        create: {
          key: HOMEPAGE_KEY,
          draft: content,
          updatedById: actorId,
        },
        update: {
          draft: content,
          updatedById: actorId,
        },
      });

      await tx.siteContentRevision.create({
        data: {
          contentId: record.id,
          snapshot: content,
          action: 'DRAFT_SAVED',
          actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CONTENT_DRAFT_SAVED',
          entity: 'SiteContent',
          entityId: record.id,
          details: { key: HOMEPAGE_KEY },
        },
      });

      return record;
    });
  }

  async publishHomepage(actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.siteContent.findUnique({
        where: { key: HOMEPAGE_KEY },
      });
      if (!current) {
        throw new BadRequestException('Save the homepage draft first');
      }

      const publishedAt = new Date();
      const snapshot = current.draft as Prisma.InputJsonValue;
      const record = await tx.siteContent.update({
        where: { id: current.id },
        data: {
          published: snapshot,
          publishedById: actorId,
          publishedAt,
        },
      });

      await tx.siteContentRevision.create({
        data: {
          contentId: current.id,
          snapshot,
          action: 'PUBLISHED',
          actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CONTENT_PUBLISHED',
          entity: 'SiteContent',
          entityId: current.id,
          details: { key: HOMEPAGE_KEY, publishedAt },
        },
      });

      return record;
    });
  }

  async getHomepageRevisions() {
    const record = await this.prisma.siteContent.findUnique({
      where: { key: HOMEPAGE_KEY },
      select: { id: true },
    });
    if (!record) return [];

    return this.prisma.siteContentRevision.findMany({
      where: { contentId: record.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async restoreHomepageRevision(revisionId: string, actorId: string) {
    const revision = await this.prisma.siteContentRevision.findUnique({
      where: { id: revisionId },
      include: { content: { select: { id: true, key: true } } },
    });
    if (!revision || revision.content.key !== HOMEPAGE_KEY) {
      throw new NotFoundException('Content revision not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const snapshot = revision.snapshot as Prisma.InputJsonValue;
      const record = await tx.siteContent.update({
        where: { id: revision.content.id },
        data: {
          draft: snapshot,
          updatedById: actorId,
        },
      });

      await tx.siteContentRevision.create({
        data: {
          contentId: record.id,
          snapshot,
          action: 'RESTORED_TO_DRAFT',
          actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CONTENT_REVISION_RESTORED',
          entity: 'SiteContent',
          entityId: record.id,
          details: { key: HOMEPAGE_KEY, revisionId },
        },
      });

      return record;
    });
  }

  private validateContent(
    content: Record<string, unknown>,
  ): Prisma.InputJsonObject {
    const serialized = JSON.stringify(content);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_CONTENT_BYTES) {
      throw new BadRequestException('Content payload is too large');
    }

    for (const locale of ['ru', 'uz']) {
      const localeContent = content[locale];
      if (
        localeContent !== undefined &&
        (localeContent === null ||
          typeof localeContent !== 'object' ||
          Array.isArray(localeContent))
      ) {
        throw new BadRequestException(`${locale} content must be an object`);
      }
    }

    return content as Prisma.InputJsonObject;
  }
}
