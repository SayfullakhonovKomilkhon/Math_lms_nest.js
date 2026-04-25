import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { QueryAnnouncementDto } from './dto/query-announcement.dto';

type Actor = { id: string; role: Role };

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateAnnouncementDto, actor: Actor) {
    if (actor.role === Role.TEACHER) {
      if (!dto.groupId) {
        throw new ForbiddenException(
          'Учитель может создавать объявления только для своих групп',
        );
      }
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: actor.id },
      });
      if (!teacher) throw new ForbiddenException('Профиль учителя не найден');
      const group = await this.prisma.group.findUnique({
        where: { id: dto.groupId },
      });
      if (!group || group.teacherId !== teacher.id) {
        throw new ForbiddenException(
          'Вы можете создавать объявления только для своих групп',
        );
      }
    }

    const isPinned =
      !!dto.isPinned &&
      (actor.role === Role.ADMIN || actor.role === Role.SUPER_ADMIN);

    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        message: dto.message,
        authorId: actor.id,
        groupId: dto.groupId || null,
        isPinned,
      },
      include: {
        author: {
          select: {
            id: true,
            role: true,
            email: true,
            teacher: { select: { fullName: true } },
          },
        },
        group: { select: { id: true, name: true } },
      },
    });

    await this.sendNotifications(
      announcement.id,
      announcement.groupId,
      announcement.title,
    );

    return this.shapeAnnouncement(announcement, false, null);
  }

  async getMy(actor: Actor, query: QueryAnnouncementDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = await this.buildAccessFilter(actor);

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              role: true,
              email: true,
              teacher: { select: { fullName: true } },
            },
          },
          group: { select: { id: true, name: true } },
          reads: {
            where: { userId: actor.id },
            select: { readAt: true },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.announcement.count({ where }),
      this.prisma.announcement.count({
        where: { AND: [where, { reads: { none: { userId: actor.id } } }] },
      }),
    ]);

    const data = items.map((a) =>
      this.shapeAnnouncement(a, a.reads.length > 0, a.reads[0]?.readAt ?? null),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        unreadCount,
      },
    };
  }

  async getAll(query: QueryAnnouncementDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = query.groupId ? { groupId: query.groupId } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              role: true,
              email: true,
              teacher: { select: { fullName: true } },
            },
          },
          group: { select: { id: true, name: true } },
          _count: { select: { reads: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const data = items.map((a) => ({
      ...this.shapeAnnouncement(a, false, null),
      readCount: a._count.reads,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async markAsRead(announcementId: string, userId: string) {
    const exists = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Объявление не найдено');

    await this.prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId } },
      update: { readAt: new Date() },
      create: { announcementId, userId },
    });
    return { success: true };
  }

  async markAllAsRead(actor: Actor) {
    const where = await this.buildAccessFilter(actor);
    const ids = await this.prisma.announcement.findMany({
      where: { AND: [where, { reads: { none: { userId: actor.id } } }] },
      select: { id: true },
    });
    if (ids.length === 0) return { success: true, count: 0 };

    await this.prisma.announcementRead.createMany({
      data: ids.map((a) => ({ announcementId: a.id, userId: actor.id })),
      skipDuplicates: true,
    });
    return { success: true, count: ids.length };
  }

  async togglePin(id: string) {
    const current = await this.prisma.announcement.findUnique({
      where: { id },
      select: { id: true, isPinned: true },
    });
    if (!current) throw new NotFoundException('Объявление не найдено');
    return this.prisma.announcement.update({
      where: { id },
      data: { isPinned: !current.isPinned },
      select: { id: true, isPinned: true },
    });
  }

  async delete(id: string, actor: Actor) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });
    if (!announcement) throw new NotFoundException('Объявление не найдено');

    if (actor.role === Role.TEACHER && announcement.authorId !== actor.id) {
      throw new ForbiddenException('Вы можете удалять только свои объявления');
    }

    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }

  async getUnreadCount(actor: Actor): Promise<{ count: number }> {
    const where = await this.buildAccessFilter(actor);
    const count = await this.prisma.announcement.count({
      where: { AND: [where, { reads: { none: { userId: actor.id } } }] },
    });
    return { count };
  }

  async getReaders(announcementId: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
      select: {
        id: true,
        title: true,
        groupId: true,
        group: { select: { id: true, name: true } },
      },
    });
    if (!announcement) throw new NotFoundException('Объявление не найдено');

    // Прочитавшие
    const reads = await this.prisma.announcementRead.findMany({
      where: { announcementId },
      orderBy: { readAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            student: {
              select: {
                fullName: true,
                group: { select: { id: true, name: true } },
              },
            },
            teacher: { select: { fullName: true } },
            parent: {
              select: {
                fullName: true,
                students: {
                  select: {
                    student: {
                      select: {
                        fullName: true,
                        group: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const readers = reads.map((r) => this.shapeReader(r.user, r.readAt));

    // Кол-во получателей (всего у кого объявление должно быть видно).
    // Совпадает с логикой sendNotifications.
    const recipientIds = await this.collectRecipientIds(announcement.groupId);

    return {
      announcement: {
        id: announcement.id,
        title: announcement.title,
        group: announcement.group,
      },
      readCount: readers.length,
      recipientCount: recipientIds.size,
      readers,
    };
  }

  // --- helpers -----------------------------------------------------------

  private async buildAccessFilter(actor: Actor) {
    if (actor.role === Role.ADMIN || actor.role === Role.SUPER_ADMIN) {
      return {};
    }

    if (actor.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: actor.id },
        select: { groupId: true },
      });
      const groupId = student?.groupId;
      return {
        OR: [{ groupId: null }, ...(groupId ? [{ groupId }] : [])],
      };
    }

    if (actor.role === Role.PARENT) {
      const parent = await this.prisma.parent.findUnique({
        where: { userId: actor.id },
        select: {
          students: {
            select: { student: { select: { groupId: true } } },
          },
        },
      });
      const groupIds = (parent?.students ?? [])
        .map((l) => l.student.groupId)
        .filter((g): g is string => Boolean(g));
      return {
        OR: [
          { groupId: null },
          ...(groupIds.length ? [{ groupId: { in: groupIds } }] : []),
        ],
      };
    }

    // TEACHER
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: actor.id },
      include: { groups: { select: { id: true } } },
    });
    const groupIds = teacher?.groups.map((g) => g.id) ?? [];
    return {
      OR: [
        { groupId: null },
        ...(groupIds.length ? [{ groupId: { in: groupIds } }] : []),
      ],
    };
  }

  private shapeAnnouncement(
    raw: {
      id: string;
      title: string;
      message: string;
      isPinned: boolean;
      createdAt: Date;
      updatedAt: Date;
      authorId: string;
      author: {
        id: string;
        role: Role;
        email: string;
        teacher: { fullName: string } | null;
      };
      group: { id: string; name: string } | null;
    },
    isRead: boolean,
    readAt: Date | null,
  ) {
    return {
      id: raw.id,
      title: raw.title,
      message: raw.message,
      isPinned: raw.isPinned,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      authorId: raw.authorId,
      authorName: this.getAuthorName(raw.author),
      group: raw.group,
      isRead,
      readAt,
    };
  }

  private getAuthorName(author: {
    role: Role;
    email: string;
    teacher: { fullName: string } | null;
  }): string {
    if (author.teacher?.fullName) return author.teacher.fullName;
    if (author.role === Role.SUPER_ADMIN) return 'Супер-администрация';
    return 'Администрация';
  }

  private async sendNotifications(
    announcementId: string,
    groupId: string | null,
    title: string,
  ) {
    const userIds = await this.collectRecipientIds(groupId);
    if (userIds.size === 0) return;

    await this.notifications.sendToMany(Array.from(userIds), {
      type: NotificationType.ANNOUNCEMENT,
      message: `Новое объявление: ${title}`,
    });

    // suppress unused var lint (announcementId is kept for future deep-linking)
    void announcementId;
  }

  private async collectRecipientIds(
    groupId: string | null,
  ): Promise<Set<string>> {
    const userIds = new Set<string>();

    if (groupId) {
      const students = await this.prisma.student.findMany({
        where: { groupId, isActive: true },
        select: {
          userId: true,
          parents: { select: { parent: { select: { userId: true } } } },
        },
      });
      for (const s of students) {
        userIds.add(s.userId);
        for (const link of s.parents) userIds.add(link.parent.userId);
      }
      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        select: { teacher: { select: { userId: true } } },
      });
      if (group?.teacher?.userId) userIds.add(group.teacher.userId);
    } else {
      const students = await this.prisma.student.findMany({
        where: { isActive: true },
        select: {
          userId: true,
          parents: { select: { parent: { select: { userId: true } } } },
        },
      });
      for (const s of students) {
        userIds.add(s.userId);
        for (const link of s.parents) userIds.add(link.parent.userId);
      }
      const teachers = await this.prisma.teacher.findMany({
        where: { isActive: true },
        select: { userId: true },
      });
      for (const t of teachers) userIds.add(t.userId);
    }

    return userIds;
  }

  private shapeReader(
    user: {
      id: string;
      email: string;
      role: Role;
      student: {
        fullName: string;
        group: { id: string; name: string } | null;
      } | null;
      teacher: { fullName: string } | null;
      parent: {
        fullName: string;
        students: {
          student: {
            fullName: string;
            group: { id: string; name: string } | null;
          };
        }[];
      } | null;
    },
    readAt: Date,
  ) {
    let fullName: string;
    let group: { id: string; name: string } | null = null;
    let extra: string | null = null;

    if (user.student) {
      fullName = user.student.fullName;
      group = user.student.group;
    } else if (user.teacher) {
      fullName = user.teacher.fullName;
    } else if (user.parent) {
      fullName = user.parent.fullName;
      const childNames = user.parent.students.map((l) => l.student.fullName);
      // Use the first child's group as a representative; cross-group parents
      // simply omit the group label.
      group = user.parent.students[0]?.student.group ?? null;
      extra = childNames.length
        ? `Родитель: ${childNames.join(', ')}`
        : 'Родитель';
    } else {
      fullName = user.email;
    }

    return {
      userId: user.id,
      fullName,
      role: user.role,
      email: user.email,
      group,
      extra,
      readAt,
    };
  }
}
