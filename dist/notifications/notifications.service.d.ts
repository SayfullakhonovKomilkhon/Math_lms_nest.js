import { NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
interface SendPayload {
    type: NotificationType;
    message: string;
    channel?: NotificationChannel;
}
export declare class NotificationsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    sendToUser(userId: string, payload: SendPayload): Promise<void>;
    sendToMany(userIds: string[], payload: SendPayload): Promise<void>;
    sendPaymentReminder(studentId: string, daysLeft: number): Promise<void>;
    sendAbsenceAlert(studentId: string, date: string): Promise<void>;
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
            id: string;
            createdAt: Date;
            userId: string;
            message: string;
            isRead: boolean;
            channel: import(".prisma/client").$Enums.NotificationChannel;
        }[];
    }>;
    getUnreadCount(userId: string): Promise<number>;
    markRead(id: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
}
export {};
