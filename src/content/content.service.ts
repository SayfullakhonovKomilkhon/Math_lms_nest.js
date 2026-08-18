import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { CreateReviewSubmissionDto } from './dto/create-review-submission.dto';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async submitReview(
    dto: CreateReviewSubmissionDto,
    files?: { image?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    if (!dto.consent) {
      throw new BadRequestException(
        'Необходимо согласие на обработку и публикацию отзыва',
      );
    }

    const image = files?.image?.[0];
    const video = files?.video?.[0];
    if (image && !image.mimetype.startsWith('image/')) {
      throw new BadRequestException(
        'В поле фотографии можно загрузить только изображение',
      );
    }
    if (image && image.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Фотография должна быть меньше 10 МБ');
    }
    if (video && !video.mimetype.startsWith('video/')) {
      throw new BadRequestException(
        'В поле видео можно загрузить только видеофайл',
      );
    }
    let imageUrl: string | undefined;
    let videoUrl: string | undefined;

    try {
      if (image) imageUrl = await this.s3.uploadPublicContent(image);
      if (video) videoUrl = await this.s3.uploadPublicContent(video);
    } catch (error) {
      if (imageUrl) await this.s3.deleteFile(imageUrl);
      throw error;
    }

    const account = dto.phone
      ? await this.prisma.user.findUnique({
          where: { phone: dto.phone },
          select: { role: true },
        })
      : null;
    const expectedRole = dto.authorRole === 'STUDENT' ? 'STUDENT' : 'PARENT';

    return this.prisma.reviewSubmission.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        authorRole: dto.authorRole,
        rating: dto.rating,
        text: dto.text,
        imageUrl,
        videoUrl,
        consent: dto.consent,
        isVerified: account?.role === expectedRole,
      },
      select: { id: true, status: true, createdAt: true },
    });
  }

  getReviewSubmissions() {
    return this.prisma.reviewSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async moderateReview(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    actorId: string,
  ) {
    const submission = await this.prisma.reviewSubmission.findUnique({
      where: { id },
    });
    if (!submission) throw new NotFoundException('Отзыв не найден');
    if (submission.status !== 'PENDING') {
      throw new BadRequestException('Этот отзыв уже обработан');
    }

    return this.prisma.$transaction(async (tx) => {
      if (status === 'APPROVED') {
        const record = await tx.siteContent.findUnique({
          where: { key: 'reviews' },
        });
        if (!record) {
          throw new BadRequestException(
            'Сначала сохраните раздел отзывов в панели контента',
          );
        }

        const item = this.reviewSubmissionToContentItem(submission);
        const draft = this.appendContentItem(record.draft, item);
        const published = this.appendContentItem(
          record.published ?? record.draft,
          item,
        );
        await tx.siteContent.update({
          where: { id: record.id },
          data: {
            draft: draft as Prisma.InputJsonValue,
            published: published as Prisma.InputJsonValue,
            updatedById: actorId,
            publishedById: actorId,
            publishedAt: new Date(),
          },
        });
        await tx.siteContentRevision.create({
          data: {
            contentId: record.id,
            snapshot: published as Prisma.InputJsonValue,
            action: 'PUBLISHED',
            actorId,
          },
        });
      }

      const updated = await tx.reviewSubmission.update({
        where: { id },
        data: { status, reviewedById: actorId, reviewedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: `REVIEW_${status}`,
          entity: 'ReviewSubmission',
          entityId: id,
          details: {
            fullName: submission.fullName,
            isVerified: submission.isVerified,
          },
        },
      });
      return updated;
    });
  }

  private appendContentItem(
    content: Prisma.JsonValue,
    item: Prisma.InputJsonObject,
  ) {
    const value =
      content && typeof content === 'object' && !Array.isArray(content)
        ? content
        : {};
    const items = Array.isArray(value.items) ? value.items : [];
    return { ...value, items: [...items, item] };
  }

  private reviewSubmissionToContentItem(submission: {
    id: string;
    fullName: string;
    authorRole: string;
    rating: number;
    text: string;
    imageUrl: string | null;
    videoUrl: string | null;
    isVerified: boolean;
    createdAt: Date;
  }): Prisma.InputJsonObject {
    const roleRu = submission.authorRole === 'PARENT' ? 'Родитель' : 'Ученик';
    const roleUz = submission.authorRole === 'PARENT' ? 'Ota-ona' : 'O‘quvchi';
    return {
      id: `review-${submission.id}`,
      isActive: true,
      date: submission.createdAt.toISOString().slice(0, 10),
      imageUrl: submission.imageUrl ?? '',
      videoUrl: submission.videoUrl ?? '',
      actionUrl: '',
      rating: submission.rating,
      isVerified: submission.isVerified,
      ru: {
        title: submission.fullName,
        subtitle: roleRu,
        description: submission.text,
        badge: submission.isVerified ? 'Проверенный отзыв' : 'Отзыв посетителя',
        actionLabel: 'Подробнее',
      },
      uz: {
        title: submission.fullName,
        subtitle: roleUz,
        description: submission.text,
        badge: submission.isVerified
          ? 'Tasdiqlangan fikr'
          : 'Tashrif buyuruvchi fikri',
        actionLabel: 'Batafsil',
      },
    };
  }

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
