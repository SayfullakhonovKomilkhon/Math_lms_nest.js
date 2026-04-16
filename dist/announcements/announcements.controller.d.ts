import { Role } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
export declare class AnnouncementsController {
    private service;
    constructor(service: AnnouncementsService);
    create(dto: CreateAnnouncementDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        group: {
            id: string;
            name: string;
        } | null;
        author: {
            email: string;
        };
    } & {
        title: string;
        id: string;
        createdAt: Date;
        groupId: string | null;
        message: string;
        authorId: string;
    }>;
    findMy(user: {
        id: string;
        role: Role;
    }): Promise<({
        group: {
            id: string;
            name: string;
        } | null;
        author: {
            email: string;
        };
    } & {
        title: string;
        id: string;
        createdAt: Date;
        groupId: string | null;
        message: string;
        authorId: string;
    })[]>;
    findAll(): Promise<({
        group: {
            id: string;
            name: string;
        } | null;
        author: {
            email: string;
        };
    } & {
        title: string;
        id: string;
        createdAt: Date;
        groupId: string | null;
        message: string;
        authorId: string;
    })[]>;
}
