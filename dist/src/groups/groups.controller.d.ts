import { Role } from '@prisma/client';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
export declare class GroupsController {
    private groupsService;
    constructor(groupsService: GroupsService);
    create(dto: CreateGroupDto, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        name: string;
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        archivedAt: Date | null;
        _count: {
            students: number;
        };
    }>;
    findAll(user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        name: string;
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        archivedAt: Date | null;
        _count: {
            students: number;
        };
    }[]>;
    findOne(id: string, user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        name: string;
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        archivedAt: Date | null;
        _count: {
            students: number;
        };
    }>;
    findStudents(id: string, user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        isActive: boolean;
        user: {
            email: string;
        };
        fullName: string;
        phone: string | null;
        gender: import(".prisma/client").$Enums.Gender;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    update(id: string, dto: UpdateGroupDto, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        name: string;
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        archivedAt: Date | null;
        _count: {
            students: number;
        };
    }>;
    archive(id: string, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        teacher: {
            id: string;
            fullName: string;
        };
        name: string;
        maxStudents: number;
        schedule: import("@prisma/client/runtime/library").JsonValue;
        archivedAt: Date | null;
        _count: {
            students: number;
        };
    }>;
}
