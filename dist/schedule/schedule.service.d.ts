import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class ScheduleService {
    private prisma;
    constructor(prisma: PrismaService);
    getMySchedule(userId: string): Promise<{
        schedule: null;
        nextTopic: null;
        groupId?: undefined;
        groupName?: undefined;
        teacher?: undefined;
    } | {
        groupId: string;
        groupName: string;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        teacher: {
            fullName: string;
            phone: string | null;
        };
        nextTopic: {
            date: Date;
            topic: string;
            materials: import("@prisma/client/runtime/library").JsonValue;
        } | null;
    }>;
    getGroupSchedule(groupId: string, user: {
        id: string;
        role: Role;
    }): Promise<{
        groupId: string;
        groupName: string;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        teacher: {
            fullName: string;
            phone: string | null;
        };
        nextTopic: {
            date: Date;
            topic: string;
        } | null;
    }>;
}
