import { Role } from '@prisma/client';
import { LessonTopicsService } from './lesson-topics.service';
import { CreateLessonTopicDto } from './dto/create-lesson-topic.dto';
export declare class LessonTopicsController {
    private service;
    constructor(service: LessonTopicsService);
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
        materials: import("@prisma/client/runtime/library").JsonValue | null;
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
        materials: import("@prisma/client/runtime/library").JsonValue | null;
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
        materials: import("@prisma/client/runtime/library").JsonValue | null;
    }) | null>;
    findSuggestions(query: {
        q?: string;
        limit?: string;
    }): Promise<{
        topic: string;
        lastUsedAt: Date;
    }[]>;
}
