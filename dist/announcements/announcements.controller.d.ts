import { Role } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { QueryAnnouncementDto } from './dto/query-announcement.dto';
type Actor = {
    id: string;
    role: Role;
};
export declare class AnnouncementsController {
    private service;
    constructor(service: AnnouncementsService);
    create(dto: CreateAnnouncementDto, user: Actor): Promise<{
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
    getMy(query: QueryAnnouncementDto, user: Actor): Promise<{
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
    getUnreadCount(user: Actor): Promise<{
        count: number;
    }>;
    markAllAsRead(user: Actor): Promise<{
        success: boolean;
        count: number;
    }>;
    markAsRead(id: string, user: Actor): Promise<{
        success: boolean;
    }>;
    togglePin(id: string): Promise<{
        id: string;
        isPinned: boolean;
    }>;
    delete(id: string, user: Actor): Promise<{
        success: boolean;
    }>;
}
export {};
