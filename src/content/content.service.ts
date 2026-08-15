import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAX_CONTENT_BYTES = 250_000;

export const CONTENT_KEYS = [
  'homepage',
  'courses',
  'founder',
  'results',
  'reviews',
  'news',
  'schedule',
  'materials',
  'mock-exams',
  'diagnostic',
  'globals',
] as const;

export type ContentKey = (typeof CONTENT_KEYS)[number];

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(key: string) {
    const contentKey = this.validateKey(key);
    const record = await this.prisma.siteContent.findUnique({
      where: { key: contentKey },
      select: { published: true, publishedAt: true, updatedAt: true },
    });

    return {
      content: record?.published ?? null,
      publishedAt: record?.publishedAt ?? null,
      updatedAt: record?.updatedAt ?? null,
    };
  }

  async getEditor(key: string) {
    const contentKey = this.validateKey(key);
    const record = await this.prisma.siteContent.findUnique({
      where: { key: contentKey },
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

  async saveDraft(
    key: string,
    rawContent: Record<string, unknown>,
    actorId: string,
  ) {
    const contentKey = this.validateKey(key);
    const content = this.validateContent(rawContent);

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.siteContent.upsert({
        where: { key: contentKey },
        create: {
          key: contentKey,
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
          details: { key: contentKey },
        },
      });

      return record;
    });
  }

  async publish(key: string, actorId: string) {
    const contentKey = this.validateKey(key);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.siteContent.findUnique({
        where: { key: contentKey },
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
          details: { key: contentKey, publishedAt },
        },
      });

      return record;
    });
  }

  async getRevisions(key: string) {
    const contentKey = this.validateKey(key);
    const record = await this.prisma.siteContent.findUnique({
      where: { key: contentKey },
      select: { id: true },
    });
    if (!record) return [];

    return this.prisma.siteContentRevision.findMany({
      where: { contentId: record.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async restoreRevision(key: string, revisionId: string, actorId: string) {
    const contentKey = this.validateKey(key);
    const revision = await this.prisma.siteContentRevision.findUnique({
      where: { id: revisionId },
      include: { content: { select: { id: true, key: true } } },
    });
    if (!revision || revision.content.key !== contentKey) {
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
          details: { key: contentKey, revisionId },
        },
      });

      return record;
    });
  }

  private validateKey(key: string): ContentKey {
    if (!CONTENT_KEYS.includes(key as ContentKey)) {
      throw new NotFoundException('Content section not found');
    }
    return key as ContentKey;
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
