import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
export declare class GroupsService {
    private prisma;
    constructor(prisma: PrismaService);
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
        schedule: Prisma.JsonValue;
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
        schedule: Prisma.JsonValue;
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
        schedule: Prisma.JsonValue;
        archivedAt: Date | null;
        _count: {
            students: number;
        };
    }>;
    findStudents(groupId: string, user: {
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
        monthlyFee: Prisma.Decimal;
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
        schedule: Prisma.JsonValue;
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
        schedule: Prisma.JsonValue;
        archivedAt: Date | null;
        _count: {
            students: number;
        };
    }>;
}
