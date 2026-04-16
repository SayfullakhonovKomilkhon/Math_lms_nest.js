import { Role } from '@prisma/client';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AssignGroupDto } from './dto/assign-group.dto';
export declare class StudentsController {
    private studentsService;
    constructor(studentsService: StudentsService);
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
    getMyProfile(userId: string): Promise<{
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
    findOne(id: string, user: {
        id: string;
        role: Role;
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
    assignGroup(id: string, dto: AssignGroupDto, actorId: string): Promise<{
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
