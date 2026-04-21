import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
export declare class StudentsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateStudentDto, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        group: {
            id: string;
            name: string;
        } | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        enrolledAt: Date;
    }>;
    findAll(): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        group: {
            id: string;
            name: string;
        } | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        enrolledAt: Date;
    }[]>;
    findOne(id: string, requestingUser?: {
        id: string;
        role: Role;
        studentId?: string;
    }): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        group: {
            id: string;
            name: string;
            teacherId: string;
        } | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        enrolledAt: Date;
    }>;
    findMyProfile(userId: string): Promise<{
        totalLessons: number;
        attendanceStats: {
            present: number;
            absent: number;
            late: number;
            percentage: number;
        };
        group: {
            teacher: {
                fullName: string;
                phone: string | null;
            };
            id: string;
            name: string;
            schedule: import("@prisma/client/runtime/library").JsonValue;
        } | null;
        id: string;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        enrolledAt: Date;
    }>;
    updateMyProfile(userId: string, dto: UpdateMyProfileDto): Promise<{
        totalLessons: number;
        attendanceStats: {
            present: number;
            absent: number;
            late: number;
            percentage: number;
        };
        group: {
            teacher: {
                fullName: string;
                phone: string | null;
            };
            id: string;
            name: string;
            schedule: import("@prisma/client/runtime/library").JsonValue;
        } | null;
        id: string;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        enrolledAt: Date;
    }>;
    update(id: string, dto: UpdateStudentDto, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        group: {
            id: string;
            name: string;
        } | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        enrolledAt: Date;
    }>;
    removeFromGroup(id: string, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        group: {
            id: string;
            name: string;
        } | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        enrolledAt: Date;
    }>;
    assignGroup(id: string, groupId: string, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        group: {
            id: string;
            name: string;
        } | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        enrolledAt: Date;
    }>;
    deactivate(id: string, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        group: {
            id: string;
            name: string;
        } | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        groupId: string | null;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        enrolledAt: Date;
    }>;
}
