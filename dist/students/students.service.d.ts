import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
declare const studentInclude: {
    user: {
        select: {
            id: true;
            phone: true;
            role: true;
            isActive: true;
        };
    };
    groups: {
        select: {
            id: true;
            monthlyFee: true;
            joinedAt: true;
            group: {
                select: {
                    id: true;
                    name: true;
                    teacherId: true;
                };
            };
        };
        orderBy: {
            joinedAt: "asc";
        };
    };
};
type RawStudent = Prisma.StudentGetPayload<{
    include: typeof studentInclude;
}>;
export type StudentGroupLink = {
    linkId: string;
    groupId: string;
    groupName: string;
    teacherId: string;
    monthlyFee: number;
    joinedAt: Date;
};
export type StudentDto = {
    id: string;
    fullName: string;
    phone: string | null;
    birthDate: Date | null;
    gender: RawStudent['gender'];
    enrolledAt: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    user: RawStudent['user'];
    groups: StudentGroupLink[];
    monthlyFee: number;
    monthlyFeeTotal: number;
    groupId: string | null;
    group: {
        id: string;
        name: string;
    } | null;
};
export declare class StudentsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateStudentDto, actorId: string): Promise<StudentDto>;
    findAll(): Promise<StudentDto[]>;
    findOne(id: string, requestingUser?: {
        id: string;
        role: Role;
        studentId?: string;
    }): Promise<StudentDto>;
    findMyProfile(userId: string): Promise<{
        id: string;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        monthlyFee: number;
        group: {
            id: string;
            name: string;
            schedule: Prisma.JsonValue;
            teacher: {
                phone: string | null;
                fullName: string;
            };
        } | null;
        groups: {
            id: string;
            name: string;
            schedule: Prisma.JsonValue;
            teacher: {
                phone: string | null;
                fullName: string;
            };
            monthlyFee: number;
            joinedAt: Date;
        }[];
        totalLessons: number;
        attendanceStats: {
            present: number;
            absent: number;
            late: number;
            percentage: number;
        };
    }>;
    updateMyProfile(userId: string, dto: UpdateMyProfileDto): Promise<{
        id: string;
        fullName: string;
        phone: string | null;
        birthDate: Date | null;
        gender: import(".prisma/client").$Enums.Gender;
        enrolledAt: Date;
        monthlyFee: number;
        group: {
            id: string;
            name: string;
            schedule: Prisma.JsonValue;
            teacher: {
                phone: string | null;
                fullName: string;
            };
        } | null;
        groups: {
            id: string;
            name: string;
            schedule: Prisma.JsonValue;
            teacher: {
                phone: string | null;
                fullName: string;
            };
            monthlyFee: number;
            joinedAt: Date;
        }[];
        totalLessons: number;
        attendanceStats: {
            present: number;
            absent: number;
            late: number;
            percentage: number;
        };
    }>;
    update(id: string, dto: UpdateStudentDto, actorId: string): Promise<StudentDto>;
    addGroup(id: string, payload: {
        groupId: string;
        monthlyFee?: number;
    }, actorId: string): Promise<StudentDto>;
    updateGroupFee(id: string, groupId: string, monthlyFee: number, actorId: string): Promise<StudentDto>;
    removeGroup(id: string, groupId: string, actorId: string): Promise<StudentDto>;
    removeFromAllGroups(id: string, actorId: string): Promise<StudentDto>;
    deactivate(id: string, actorId: string): Promise<StudentDto>;
    updateCredentials(studentId: string, payload: {
        phone?: string;
        password?: string;
    }, actorId: string): Promise<{
        ok: boolean;
        phoneChanged?: undefined;
    } | {
        ok: boolean;
        phoneChanged: boolean;
    }>;
}
export {};
