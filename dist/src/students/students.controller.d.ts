import { Role } from '@prisma/client';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AssignGroupDto } from './dto/assign-group.dto';
export declare class StudentsController {
    private studentsService;
    constructor(studentsService: StudentsService);
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
    getMyProfile(userId: string): Promise<{
        totalLessons: number;
        attendanceStats: {
            present: number;
            absent: number;
            late: number;
            percentage: number;
        };
        id: string;
        fullName: string;
        phone: string | null;
        group: {
            id: string;
            teacher: {
                fullName: string;
                phone: string | null;
            };
            name: string;
            schedule: import("@prisma/client/runtime/library").JsonValue;
        } | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
    }>;
    findOne(id: string, user: {
        id: string;
        role: Role;
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
    assignGroup(id: string, dto: AssignGroupDto, actorId: string): Promise<{
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
