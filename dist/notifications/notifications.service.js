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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async sendToUser(userId, payload) {
        await this.prisma.notification.create({
            data: {
                userId,
                type: payload.type,
                message: payload.message,
                channel: payload.channel ?? client_1.NotificationChannel.IN_APP,
                isRead: false,
            },
        });
        if (payload.channel === client_1.NotificationChannel.TELEGRAM) {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { telegramChatId: true },
            });
            if (user?.telegramChatId) {
                this.logger.log(`[Telegram] Would send to ${user.telegramChatId}: ${payload.message}`);
            }
        }
    }
    async sendToMany(userIds, payload) {
        await this.prisma.notification.createMany({
            data: userIds.map((userId) => ({
                userId,
                type: payload.type,
                message: payload.message,
                channel: payload.channel ?? client_1.NotificationChannel.IN_APP,
                isRead: false,
            })),
        });
    }
    async sendPaymentReminder(studentId, daysLeft) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                user: true,
                parents: { include: { parent: { include: { user: true } } } },
            },
        });
        if (!student)
            return;
        const amount = Number(student.monthlyFee);
        const message = daysLeft > 0
            ? `💳 До оплаты осталось ${daysLeft} дней. Сумма: ${amount.toLocaleString('ru-RU')} сум`
            : `⚠️ Срок оплаты прошёл. Сумма: ${amount.toLocaleString('ru-RU')} сум`;
        await this.sendToUser(student.userId, {
            type: client_1.NotificationType.PAYMENT,
            message,
        });
        for (const link of student.parents) {
            await this.sendToUser(link.parent.userId, {
                type: client_1.NotificationType.PAYMENT,
                message,
            });
        }
    }
    async sendAbsenceAlert(studentId, date) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                parents: { include: { parent: { include: { user: true } } } },
            },
        });
        if (!student || student.parents.length === 0)
            return;
        const message = `⚠️ ${student.fullName} не пришёл на урок ${date}`;
        for (const link of student.parents) {
            await this.sendToUser(link.parent.userId, {
                type: client_1.NotificationType.ATTENDANCE,
                message,
            });
        }
    }
    async sendAchievementNotification(studentId, achievement) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                parents: { include: { parent: { include: { user: true } } } },
            },
        });
        if (!student)
            return;
        await this.sendToUser(student.userId, {
            type: client_1.NotificationType.ACHIEVEMENT,
            message: `🏆 Новое достижение: ${achievement.title} ${achievement.icon}`,
        });
        for (const link of student.parents) {
            await this.sendToUser(link.parent.userId, {
                type: client_1.NotificationType.ACHIEVEMENT,
                message: `🏆 ${student.fullName} получил новое достижение: ${achievement.title} ${achievement.icon}`,
            });
        }
    }
    async sendReceiptStatusNotification(paymentId, status, reason) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: { student: { include: { user: true } } },
        });
        if (!payment)
            return;
        const statusText = status === 'CONFIRMED' ? '✅ подтверждён' : '❌ отклонён';
        let message = `💳 Ваш чек об оплате ${statusText}`;
        if (status === 'REJECTED' && reason) {
            message += `. Причина: ${reason}`;
        }
        await this.sendToUser(payment.student.userId, {
            type: client_1.NotificationType.PAYMENT,
            message,
        });
    }
    async sendHomeworkNotification(groupId, homeworkId) {
        const homework = await this.prisma.homework.findUnique({
            where: { id: homeworkId },
            include: { teacher: true },
        });
        if (!homework)
            return;
        const students = await this.prisma.student.findMany({
            where: { groupId, isActive: true },
            select: { userId: true },
        });
        const message = `📚 Новое домашнее задание от ${homework.teacher.fullName}`;
        const userIds = students.map((s) => s.userId);
        if (userIds.length > 0) {
            await this.sendToMany(userIds, {
                type: client_1.NotificationType.HOMEWORK,
                message,
            });
        }
    }
    async getNotifications(userId, params) {
        const limit = params.limit ?? 20;
        const page = params.page ?? 0;
        const where = { userId };
        if (params.isRead !== undefined)
            where.isRead = params.isRead;
        if (params.type)
            where.type = params.type;
        const [total, notifications] = await Promise.all([
            this.prisma.notification.count({ where }),
            this.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: page * limit,
            }),
        ]);
        return { total, notifications };
    }
    async getUnreadCount(userId) {
        return this.prisma.notification.count({ where: { userId, isRead: false } });
    }
    async markRead(id, userId) {
        await this.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
        });
    }
    async markAllRead(userId) {
        await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map