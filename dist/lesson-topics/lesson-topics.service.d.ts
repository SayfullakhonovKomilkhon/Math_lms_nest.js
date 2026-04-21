import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonTopicDto } from './dto/create-lesson-topic.dto';
export declare class LessonTopicsService {
    private prisma;
    constructor(prisma: PrismaService);
    private assertTeacherOwnsGroup;
    create(dto: CreateLessonTopicDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        teacher: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        teacherId: string;
        groupId: string;
        date: Date;
        topic: string;
        materials: Prisma.JsonValue | null;
    }>;
    findAll(query: {
        groupId?: string;
        from?: string;
        to?: string;
    }, user: {
        id: string;
        role: Role;
    }): Promise<({
        teacher: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        teacherId: string;
        groupId: string;
        date: Date;
        topic: string;
        materials: Prisma.JsonValue | null;
    })[]>;
    findNext(groupId: string): Promise<({
        teacher: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        teacherId: string;
        groupId: string;
        date: Date;
        topic: string;
        materials: Prisma.JsonValue | null;
    }) | null>;
    findSuggestions(query: {
        q?: string;
        limit?: number;
    }): Promise<{
        topic: string;
        lastUsedAt: Date;
    }[]>;
}
