import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
export declare class AnnouncementsService {
    private prisma;
    constructor(prisma: PrismaService);
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
        id: string;
        createdAt: Date;
        groupId: string | null;
        title: string;
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
        id: string;
        createdAt: Date;
        groupId: string | null;
        title: string;
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
        id: string;
        createdAt: Date;
        groupId: string | null;
        title: string;
        message: string;
        authorId: string;
    })[]>;
}
