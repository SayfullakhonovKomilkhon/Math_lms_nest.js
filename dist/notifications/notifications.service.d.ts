import { AttendanceStatus, NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
interface SendPayload {
    type: NotificationType;
    message: string;
    channel?: NotificationChannel;
}
export declare class NotificationsService {
    private prisma;
    private telegram;
    private readonly logger;
    constructor(prisma: PrismaService, telegram: TelegramService);
    sendToUser(userId: string, payload: SendPayload): Promise<void>;
    sendToMany(userIds: string[], payload: SendPayload): Promise<void>;
    private pushTelegram;
    private sendBoth;
    sendPaymentReminder(studentId: string, daysLeft: number): Promise<void>;
    sendAttendanceToParents(studentId: string, groupId: string, status: AttendanceStatus, date: string): Promise<void>;
    sendAbsenceAlert(studentId: string, date: string): Promise<void>;
    sendGradeNotification(gradeId: string): Promise<void>;
    sendSalaryNotification(teacherId: string, oldRate: number, newRate: number): Promise<void>;
    sendLessonReminder(userIds: string[], groupName: string, startTime: string, minutesUntil: number): Promise<void>;
    sendAchievementNotification(studentId: string, achievement: {
        title: string;
        icon: string;
    }): Promise<void>;
    sendReceiptStatusNotification(paymentId: string, status: 'CONFIRMED' | 'REJECTED', reason?: string): Promise<void>;
    sendHomeworkNotification(groupId: string, homeworkId: string): Promise<void>;
    getNotifications(userId: string, params: {
        isRead?: boolean;
        type?: NotificationType;
        limit?: number;
        page?: number;
    }): Promise<{
        total: number;
        notifications: {
            type: import(".prisma/client").$Enums.NotificationType;
            message: string;
            id: string;
            createdAt: Date;
            userId: string;
            channel: import(".prisma/client").$Enums.NotificationChannel;
            isRead: boolean;
        }[];
    }>;
    getUnreadCount(userId: string): Promise<number>;
    markRead(id: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
}
export {};
