import { Role } from '@prisma/client';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
export declare class GroupsController {
    private groupsService;
    constructor(groupsService: GroupsService);
    create(dto: CreateGroupDto, actorId: string): Promise<{
        defaultMonthlyFee: number;
        teacher: {
            id: string;
            fullName: string;
        };
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        _count: {
            students: number;
        };
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        isRatingVisible: boolean;
        archivedAt: Date | null;
    }>;
    findAll(user: {
        id: string;
        role: Role;
    }): Promise<{
        defaultMonthlyFee: number;
        teacher: {
            id: string;
            fullName: string;
        };
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        _count: {
            students: number;
        };
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        isRatingVisible: boolean;
        archivedAt: Date | null;
    }[]>;
    findOne(id: string, user: {
        id: string;
        role: Role;
    }): Promise<{
        defaultMonthlyFee: number;
        teacher: {
            id: string;
            fullName: string;
        };
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        _count: {
            students: number;
        };
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        isRatingVisible: boolean;
        archivedAt: Date | null;
    }>;
    findStudents(id: string, user: {
        id: string;
        role: Role;
    }): Promise<{
        monthlyFee: number;
        joinedAt: Date;
        hasPaidThisMonth: boolean;
        user: {
            phone: string;
        };
        phone: string | null;
        id: string;
        isActive: boolean;
        fullName: string;
        gender: import(".prisma/client").$Enums.Gender;
    }[]>;
    update(id: string, dto: UpdateGroupDto, actorId: string): Promise<{
        defaultMonthlyFee: number;
        teacher: {
            id: string;
            fullName: string;
        };
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        _count: {
            students: number;
        };
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        isRatingVisible: boolean;
        archivedAt: Date | null;
    }>;
    archive(id: string, actorId: string): Promise<{
        defaultMonthlyFee: number;
        teacher: {
            id: string;
            fullName: string;
        };
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        _count: {
            students: number;
        };
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        isRatingVisible: boolean;
        archivedAt: Date | null;
    }>;
    updateRatingVisibility(id: string, isRatingVisible: boolean, user: {
        id: string;
        role: Role;
    }): Promise<{
        defaultMonthlyFee: number;
        teacher: {
            id: string;
            fullName: string;
        };
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        _count: {
            students: number;
        };
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        isRatingVisible: boolean;
        archivedAt: Date | null;
    }>;
}
