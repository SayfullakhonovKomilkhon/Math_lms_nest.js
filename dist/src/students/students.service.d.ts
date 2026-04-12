import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
export declare class StudentsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateStudentDto, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        group: {
            id: string;
            name: string;
        } | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    findAll(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        group: {
            id: string;
            name: string;
        } | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    findOne(id: string, requestingUser?: {
        id: string;
        role: Role;
        studentId?: string;
    }): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        group: {
            id: string;
            name: string;
            teacherId: string;
        } | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    findMyProfile(userId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        group: {
            id: string;
            name: string;
        } | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    update(id: string, dto: UpdateStudentDto, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        group: {
            id: string;
            name: string;
        } | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    assignGroup(id: string, groupId: string, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        group: {
            id: string;
            name: string;
        } | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    deactivate(id: string, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        group: {
            id: string;
            name: string;
        } | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
}
