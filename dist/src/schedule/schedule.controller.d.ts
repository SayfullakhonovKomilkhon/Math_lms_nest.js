import { Role } from '@prisma/client';
import { ScheduleService } from './schedule.service';
export declare class ScheduleController {
    private service;
    constructor(service: ScheduleService);
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
