import { AttendanceStatus, NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { ExpoPushService, PushData } from '../devices/expo-push.service';
interface SendPayload {
    type: NotificationType;
    message: string;
    channel?: NotificationChannel;
    data?: PushData;
}
type AttendanceReminderPhase = 'BEFORE' | 'DURING' | 'AFTER';
export declare class NotificationsService {
    private prisma;
    private telegram;
    private expoPush;
    private readonly logger;
    constructor(prisma: PrismaService, telegram: TelegramService, expoPush: ExpoPushService);
    sendToUser(userId: string, payload: SendPayload): Promise<void>;
    sendToMany(userIds: string[], payload: SendPayload): Promise<void>;
    private pushTelegram;
    private sendBoth;
    private sendToParentMobile;
    sendPaymentReminder(studentId: string, daysLeft: number): Promise<void>;
    sendAttendanceToParents(studentId: string, groupId: string, status: AttendanceStatus, date: string): Promise<void>;
    sendAbsenceAlert(studentId: string, date: string): Promise<void>;
    sendGradeNotification(gradeId: string): Promise<void>;
    sendSalaryNotification(teacherId: string, oldRate: number, newRate: number): Promise<void>;
    sendLessonReminder(userIds: string[], groupName: string, startTime: string, minutesUntil: number): Promise<void>;
    sendAttendanceReminder(teacherUserId: string, groupName: string, phase: AttendanceReminderPhase, markedCount: number, totalCount: number): Promise<void>;
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
            data: Prisma.JsonValue | null;
            channel: import(".prisma/client").$Enums.NotificationChannel;
            isRead: boolean;
        }[];
    }>;
    getUnreadCount(userId: string): Promise<number>;
    markRead(id: string, userId: string): Promise<void>;
    markAllRead(userId: string): Promise<void>;
}
export {};
