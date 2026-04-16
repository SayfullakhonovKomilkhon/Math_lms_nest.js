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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationsProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_2 = require("@nestjs/bullmq");
const bullmq_3 = require("bullmq");
const notifications_service_1 = require("./notifications.service");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let NotificationsProcessor = NotificationsProcessor_1 = class NotificationsProcessor extends bullmq_1.WorkerHost {
    constructor(notificationsService, prisma, notificationsQueue) {
        super();
        this.notificationsService = notificationsService;
        this.prisma = prisma;
        this.notificationsQueue = notificationsQueue;
        this.logger = new common_1.Logger(NotificationsProcessor_1.name);
    }
    async checkPaymentReminders() {
        this.logger.log('Checking payment reminders...');
        await this.notificationsQueue.add('check-payment-reminders', {});
    }
    async process(job) {
        try {
            switch (job.name) {
                case 'check-payment-reminders':
                    return await this.processPaymentReminders();
                case 'send-absence-alert':
                    return await this.notificationsService.sendAbsenceAlert(job.data.studentId, job.data.date);
                case 'send-homework-notification':
                    return await this.notificationsService.sendHomeworkNotification(job.data.groupId, job.data.homeworkId);
            }
        }
        catch (err) {
            console.error(`[NotificationsProcessor] Error processing job ${job.name} (${job.id}):`, err);
        }
    }
    async processPaymentReminders() {
        const settings = await this.prisma.setting.findMany({
            where: {
                key: { in: ['payment_reminder_days_1', 'payment_reminder_days_2', 'payment_reminder_days_3'] },
            },
        });
        const reminderDays = settings.map((s) => parseInt(s.value, 10)).filter((d) => !isNaN(d));
        const now = new Date();
        const activeStudents = await this.prisma.student.findMany({
            where: { isActive: true },
            include: {
                payments: {
                    where: { status: client_1.PaymentStatus.CONFIRMED },
                    orderBy: { confirmedAt: 'desc' },
                    take: 1,
                    select: { nextPaymentDate: true },
                },
            },
        });
        for (const student of activeStudents) {
            const lastPayment = student.payments[0];
            if (!lastPayment?.nextPaymentDate)
                continue;
            const nextDate = new Date(lastPayment.nextPaymentDate);
            const diffMs = nextDate.getTime() - now.getTime();
            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) {
                await this.notificationsService.sendPaymentReminder(student.id, daysLeft);
            }
            else if (reminderDays.includes(daysLeft)) {
                await this.notificationsService.sendPaymentReminder(student.id, daysLeft);
            }
        }
    }
};
exports.NotificationsProcessor = NotificationsProcessor;
__decorate([
    (0, schedule_1.Cron)('0 9 * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsProcessor.prototype, "checkPaymentReminders", null);
exports.NotificationsProcessor = NotificationsProcessor = NotificationsProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('notifications'),
    __param(2, (0, bullmq_2.InjectQueue)('notifications')),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        prisma_service_1.PrismaService,
        bullmq_3.Queue])
], NotificationsProcessor);
//# sourceMappingURL=notifications.processor.js.map