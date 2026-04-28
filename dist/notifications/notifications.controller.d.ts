import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
declare class NotificationsQueryDto {
    isRead?: boolean;
    type?: NotificationType;
    limit?: number;
    page?: number;
}
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    getAll(req: any, query: NotificationsQueryDto): Promise<{
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
    getUnreadCount(req: any): Promise<{
        count: number;
    }>;
    markRead(id: string, req: any): Promise<{
        success: boolean;
    }>;
    markAllRead(req: any): Promise<{
        success: boolean;
    }>;
}
export {};
