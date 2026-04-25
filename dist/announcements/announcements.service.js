"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnouncementsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
let AnnouncementsService = class AnnouncementsService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async create(dto, actor) {
        if (actor.role === client_1.Role.TEACHER) {
            if (!dto.groupId) {
                throw new common_1.ForbiddenException('Учитель может создавать объявления только для своих групп');
            }
            const teacher = await this.prisma.teacher.findUnique({
                where: { userId: actor.id },
            });
            if (!teacher)
                throw new common_1.ForbiddenException('Профиль учителя не найден');
            const group = await this.prisma.group.findUnique({
                where: { id: dto.groupId },
            });
            if (!group || group.teacherId !== teacher.id) {
                throw new common_1.ForbiddenException('Вы можете создавать объявления только для своих групп');
            }
        }
        const isPinned = !!dto.isPinned &&
            (actor.role === client_1.Role.ADMIN || actor.role === client_1.Role.SUPER_ADMIN);
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
        await this.sendNotifications(announcement.id, announcement.groupId, announcement.title);
        return this.shapeAnnouncement(announcement, false, null);
    }
    async getMy(actor, query) {
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
        const data = items.map((a) => this.shapeAnnouncement(a, a.reads.length > 0, a.reads[0]?.readAt ?? null));
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
    async getAll(query) {
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
    async markAsRead(announcementId, userId) {
        const exists = await this.prisma.announcement.findUnique({
            where: { id: announcementId },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Объявление не найдено');
        await this.prisma.announcementRead.upsert({
            where: { announcementId_userId: { announcementId, userId } },
            update: { readAt: new Date() },
            create: { announcementId, userId },
        });
        return { success: true };
    }
    async markAllAsRead(actor) {
        const where = await this.buildAccessFilter(actor);
        const ids = await this.prisma.announcement.findMany({
            where: { AND: [where, { reads: { none: { userId: actor.id } } }] },
            select: { id: true },
        });
        if (ids.length === 0)
            return { success: true, count: 0 };
        await this.prisma.announcementRead.createMany({
            data: ids.map((a) => ({ announcementId: a.id, userId: actor.id })),
            skipDuplicates: true,
        });
        return { success: true, count: ids.length };
    }
    async togglePin(id) {
        const current = await this.prisma.announcement.findUnique({
            where: { id },
            select: { id: true, isPinned: true },
        });
        if (!current)
            throw new common_1.NotFoundException('Объявление не найдено');
        return this.prisma.announcement.update({
            where: { id },
            data: { isPinned: !current.isPinned },
            select: { id: true, isPinned: true },
        });
    }
    async delete(id, actor) {
        const announcement = await this.prisma.announcement.findUnique({
            where: { id },
        });
        if (!announcement)
            throw new common_1.NotFoundException('Объявление не найдено');
        if (actor.role === client_1.Role.TEACHER && announcement.authorId !== actor.id) {
            throw new common_1.ForbiddenException('Вы можете удалять только свои объявления');
        }
        await this.prisma.announcement.delete({ where: { id } });
        return { success: true };
    }
    async getUnreadCount(actor) {
        const where = await this.buildAccessFilter(actor);
        const count = await this.prisma.announcement.count({
            where: { AND: [where, { reads: { none: { userId: actor.id } } }] },
        });
        return { count };
    }
    async getReaders(announcementId) {
        const announcement = await this.prisma.announcement.findUnique({
            where: { id: announcementId },
            select: {
                id: true,
                title: true,
                groupId: true,
                group: { select: { id: true, name: true } },
            },
        });
        if (!announcement)
            throw new common_1.NotFoundException('Объявление не найдено');
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
    async buildAccessFilter(actor) {
        if (actor.role === client_1.Role.ADMIN || actor.role === client_1.Role.SUPER_ADMIN) {
            return {};
        }
        if (actor.role === client_1.Role.STUDENT) {
            const student = await this.prisma.student.findUnique({
                where: { userId: actor.id },
                select: { groupId: true },
            });
            const groupId = student?.groupId;
            return {
                OR: [{ groupId: null }, ...(groupId ? [{ groupId }] : [])],
            };
        }
        if (actor.role === client_1.Role.PARENT) {
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
                .filter((g) => Boolean(g));
            return {
                OR: [
                    { groupId: null },
                    ...(groupIds.length ? [{ groupId: { in: groupIds } }] : []),
                ],
            };
        }
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
    shapeAnnouncement(raw, isRead, readAt) {
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
    getAuthorName(author) {
        if (author.teacher?.fullName)
            return author.teacher.fullName;
        if (author.role === client_1.Role.SUPER_ADMIN)
            return 'Супер-администрация';
        return 'Администрация';
    }
    async sendNotifications(announcementId, groupId, title) {
        const userIds = await this.collectRecipientIds(groupId);
        if (userIds.size === 0)
            return;
        await this.notifications.sendToMany(Array.from(userIds), {
            type: client_1.NotificationType.ANNOUNCEMENT,
            message: `Новое объявление: ${title}`,
        });
        void announcementId;
    }
    async collectRecipientIds(groupId) {
        const userIds = new Set();
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
                for (const link of s.parents)
                    userIds.add(link.parent.userId);
            }
            const group = await this.prisma.group.findUnique({
                where: { id: groupId },
                select: { teacher: { select: { userId: true } } },
            });
            if (group?.teacher?.userId)
                userIds.add(group.teacher.userId);
        }
        else {
            const students = await this.prisma.student.findMany({
                where: { isActive: true },
                select: {
                    userId: true,
                    parents: { select: { parent: { select: { userId: true } } } },
                },
            });
            for (const s of students) {
                userIds.add(s.userId);
                for (const link of s.parents)
                    userIds.add(link.parent.userId);
            }
            const teachers = await this.prisma.teacher.findMany({
                where: { isActive: true },
                select: { userId: true },
            });
            for (const t of teachers)
                userIds.add(t.userId);
        }
        return userIds;
    }
    shapeReader(user, readAt) {
        let fullName;
        let group = null;
        let extra = null;
        if (user.student) {
            fullName = user.student.fullName;
            group = user.student.group;
        }
        else if (user.teacher) {
            fullName = user.teacher.fullName;
        }
        else if (user.parent) {
            fullName = user.parent.fullName;
            const childNames = user.parent.students.map((l) => l.student.fullName);
            group = user.parent.students[0]?.student.group ?? null;
            extra = childNames.length
                ? `Родитель: ${childNames.join(', ')}`
                : 'Родитель';
        }
        else {
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
};
exports.AnnouncementsService = AnnouncementsService;
exports.AnnouncementsService = AnnouncementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], AnnouncementsService);
//# sourceMappingURL=announcements.service.js.map