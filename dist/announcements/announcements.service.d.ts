import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { QueryAnnouncementDto } from './dto/query-announcement.dto';
type Actor = {
    id: string;
    role: Role;
};
export declare class AnnouncementsService {
    private prisma;
    private notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    create(dto: CreateAnnouncementDto, actor: Actor): Promise<{
        id: string;
        title: string;
        message: string;
        isPinned: boolean;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        authorName: string;
        group: {
            id: string;
            name: string;
        } | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    getMy(actor: Actor, query: QueryAnnouncementDto): Promise<{
        data: {
            id: string;
            title: string;
            message: string;
            isPinned: boolean;
            createdAt: Date;
            updatedAt: Date;
            authorId: string;
            authorName: string;
            group: {
                id: string;
                name: string;
            } | null;
            isRead: boolean;
            readAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            unreadCount: number;
        };
    }>;
    getAll(query: QueryAnnouncementDto): Promise<{
        data: {
            readCount: number;
            id: string;
            title: string;
            message: string;
            isPinned: boolean;
            createdAt: Date;
            updatedAt: Date;
            authorId: string;
            authorName: string;
            group: {
                id: string;
                name: string;
            } | null;
            isRead: boolean;
            readAt: Date | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    markAsRead(announcementId: string, userId: string): Promise<{
        success: boolean;
    }>;
    markAllAsRead(actor: Actor): Promise<{
        success: boolean;
        count: number;
    }>;
    togglePin(id: string): Promise<{
        id: string;
        isPinned: boolean;
    }>;
    delete(id: string, actor: Actor): Promise<{
        success: boolean;
    }>;
    getUnreadCount(actor: Actor): Promise<{
        count: number;
    }>;
    getReaders(announcementId: string): Promise<{
        announcement: {
            id: string;
            title: string;
            group: {
                id: string;
                name: string;
            } | null;
        };
        readCount: number;
        recipientCount: number;
        readers: {
            userId: string;
            fullName: string;
            role: import(".prisma/client").$Enums.Role;
            email: string;
            group: {
                id: string;
                name: string;
            } | null;
            extra: string | null;
            readAt: Date;
        }[];
    }>;
    private buildAccessFilter;
    private shapeAnnouncement;
    private getAuthorName;
    private sendNotifications;
    private collectRecipientIds;
    private shapeReader;
}
export {};
