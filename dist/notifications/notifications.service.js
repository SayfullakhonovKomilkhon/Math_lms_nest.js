"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const telegram_service_1 = require("../telegram/telegram.service");
const tpl = __importStar(require("./templates"));
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, telegram) {
        this.prisma = prisma;
        this.telegram = telegram;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async sendToUser(userId, payload) {
        const channel = payload.channel ?? client_1.NotificationChannel.IN_APP;
        await this.prisma.notification.create({
            data: {
                userId,
                type: payload.type,
                message: payload.message,
                channel,
                isRead: false,
            },
        });
        if (channel === client_1.NotificationChannel.TELEGRAM) {
            await this.pushTelegram(userId, payload.message);
        }
    }
    async sendToMany(userIds, payload) {
        if (userIds.length === 0)
            return;
        const channel = payload.channel ?? client_1.NotificationChannel.IN_APP;
        await this.prisma.notification.createMany({
            data: userIds.map((userId) => ({
                userId,
                type: payload.type,
                message: payload.message,
                channel,
                isRead: false,
            })),
        });
        if (channel === client_1.NotificationChannel.TELEGRAM) {
            const users = await this.prisma.user.findMany({
                where: { id: { in: userIds }, telegramChatId: { not: null } },
                select: { telegramChatId: true },
            });
            for (const u of users) {
                if (u.telegramChatId) {
                    await this.telegram.sendMessage(u.telegramChatId, payload.message);
                }
            }
        }
    }
    async pushTelegram(userId, message) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { telegramChatId: true },
        });
        if (!user?.telegramChatId)
            return;
        await this.telegram.sendMessage(user.telegramChatId, message);
    }
    async sendBoth(userId, type, message) {
        await this.prisma.notification.create({
            data: {
                userId,
                type,
                message,
                channel: client_1.NotificationChannel.IN_APP,
                isRead: false,
            },
        });
        await this.pushTelegram(userId, message);
    }
    async sendPaymentReminder(studentId, daysLeft) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                user: true,
                parents: { include: { parent: { include: { user: true } } } },
                groups: { select: { monthlyFee: true } },
            },
        });
        if (!student)
            return;
        const amount = student.groups.reduce((acc, link) => acc + Number(link.monthlyFee), 0);
        await this.sendBoth(student.userId, client_1.NotificationType.PAYMENT, tpl.paymentForStudent(daysLeft, amount));
        for (const link of student.parents) {
            await this.sendBoth(link.parent.userId, client_1.NotificationType.PAYMENT, tpl.paymentForParent(student.fullName, daysLeft, amount));
        }
    }
    async sendAttendanceToParents(studentId, groupId, status, date) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                parents: { include: { parent: { include: { user: true } } } },
            },
        });
        if (!student)
            return;
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            select: { name: true },
        });
        const groupName = group?.name ?? 'Группа';
        if (status === client_1.AttendanceStatus.LATE ||
            status === client_1.AttendanceStatus.ABSENT) {
            await this.sendBoth(student.userId, client_1.NotificationType.ATTENDANCE, tpl.attendanceForStudent(status, groupName, date));
        }
        for (const link of student.parents) {
            await this.sendBoth(link.parent.userId, client_1.NotificationType.ATTENDANCE, tpl.attendanceForParent(student.fullName, status, groupName, date));
        }
    }
    async sendAbsenceAlert(studentId, date) {
        const attendance = await this.prisma.attendance.findFirst({
            where: { studentId, date: new Date(date) },
            orderBy: { createdAt: 'desc' },
            select: { groupId: true },
        });
        if (!attendance)
            return;
        await this.sendAttendanceToParents(studentId, attendance.groupId, client_1.AttendanceStatus.ABSENT, date);
    }
    async sendGradeNotification(gradeId) {
        const grade = await this.prisma.grade.findUnique({
            where: { id: gradeId },
            include: {
                student: {
                    include: {
                        user: true,
                        parents: { include: { parent: { include: { user: true } } } },
                    },
                },
                group: { select: { name: true } },
            },
        });
        if (!grade)
            return;
        const score = Number(grade.score);
        const maxScore = Number(grade.maxScore);
        const groupName = grade.group.name;
        await this.sendBoth(grade.student.userId, client_1.NotificationType.GRADE, tpl.gradeForStudent(score, maxScore, groupName, grade.lessonType));
        for (const link of grade.student.parents) {
            await this.sendBoth(link.parent.userId, client_1.NotificationType.GRADE, tpl.gradeForParent(grade.student.fullName, score, maxScore, groupName, grade.lessonType));
        }
    }
    async sendSalaryNotification(teacherId, oldRate, newRate) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { id: teacherId },
            select: { userId: true, fullName: true },
        });
        if (!teacher)
            return;
        await this.sendBoth(teacher.userId, client_1.NotificationType.SALARY, tpl.salaryRateUpdated(oldRate, newRate));
    }
    async sendLessonReminder(userIds, groupName, startTime, minutesUntil) {
        if (userIds.length === 0)
            return;
        const message = tpl.lessonReminder(groupName, startTime, minutesUntil);
        await this.prisma.notification.createMany({
            data: userIds.map((userId) => ({
                userId,
                type: client_1.NotificationType.LESSON_REMINDER,
                message,
                channel: client_1.NotificationChannel.IN_APP,
                isRead: false,
            })),
        });
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds }, telegramChatId: { not: null } },
            select: { telegramChatId: true },
        });
        for (const u of users) {
            if (u.telegramChatId) {
                await this.telegram.sendMessage(u.telegramChatId, message);
            }
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
        await this.sendBoth(student.userId, client_1.NotificationType.ACHIEVEMENT, tpl.achievementForStudent(achievement.title, achievement.icon));
        for (const link of student.parents) {
            await this.sendBoth(link.parent.userId, client_1.NotificationType.ACHIEVEMENT, tpl.achievementForParent(student.fullName, achievement.title, achievement.icon));
        }
    }
    async sendReceiptStatusNotification(paymentId, status, reason) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: { student: { include: { user: true } } },
        });
        if (!payment)
            return;
        await this.sendBoth(payment.student.userId, client_1.NotificationType.PAYMENT, tpl.paymentReceiptStatus(status, reason));
    }
    async sendHomeworkNotification(groupId, homeworkId) {
        const homework = await this.prisma.homework.findUnique({
            where: { id: homeworkId },
            include: { teacher: true, group: { select: { name: true } } },
        });
        if (!homework)
            return;
        const students = await this.prisma.student.findMany({
            where: {
                isActive: true,
                groups: { some: { groupId } },
            },
            select: {
                userId: true,
                fullName: true,
                parents: { select: { parent: { select: { userId: true } } } },
            },
        });
        const studentMessage = tpl.homeworkForStudent(homework.teacher.fullName, homework.group.name, homework.dueDate ?? null);
        for (const s of students) {
            await this.sendBoth(s.userId, client_1.NotificationType.HOMEWORK, studentMessage);
            for (const link of s.parents) {
                await this.sendBoth(link.parent.userId, client_1.NotificationType.HOMEWORK, tpl.homeworkForParent(s.fullName, homework.teacher.fullName, homework.group.name, homework.dueDate ?? null));
            }
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        telegram_service_1.TelegramService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map