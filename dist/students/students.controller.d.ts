import { Role } from '@prisma/client';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { AssignGroupDto } from './dto/assign-group.dto';
import { UpdateGroupFeeDto } from './dto/update-group-fee.dto';
import { UpdateCredentialsDto } from './dto/update-credentials.dto';
export declare class StudentsController {
    private studentsService;
    constructor(studentsService: StudentsService);
    create(dto: CreateStudentDto, actorId: string): Promise<import("./students.service").StudentDto>;
    findAll(): Promise<import("./students.service").StudentDto[]>;
    getMyProfile(userId: string): Promise<{
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
            schedule: import("@prisma/client/runtime/library").JsonValue;
            teacher: {
                phone: string | null;
                fullName: string;
            };
        } | null;
        groups: {
            id: string;
            name: string;
            schedule: import("@prisma/client/runtime/library").JsonValue;
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
            schedule: import("@prisma/client/runtime/library").JsonValue;
            teacher: {
                phone: string | null;
                fullName: string;
            };
        } | null;
        groups: {
            id: string;
            name: string;
            schedule: import("@prisma/client/runtime/library").JsonValue;
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
    findOne(id: string, user: {
        id: string;
        role: Role;
    }): Promise<import("./students.service").StudentDto>;
    update(id: string, dto: UpdateStudentDto, actorId: string): Promise<import("./students.service").StudentDto>;
    addGroup(id: string, dto: AssignGroupDto, actorId: string): Promise<import("./students.service").StudentDto>;
    updateGroupFee(id: string, groupId: string, dto: UpdateGroupFeeDto, actorId: string): Promise<import("./students.service").StudentDto>;
    removeGroup(id: string, groupId: string, actorId: string): Promise<import("./students.service").StudentDto>;
    assignGroup(id: string, dto: AssignGroupDto, actorId: string): Promise<import("./students.service").StudentDto>;
    removeFromGroup(id: string, actorId: string): Promise<import("./students.service").StudentDto>;
    deactivate(id: string, actorId: string): Promise<import("./students.service").StudentDto>;
    updateCredentials(id: string, dto: UpdateCredentialsDto, actorId: string): Promise<{
        ok: boolean;
        phoneChanged?: undefined;
    } | {
        ok: boolean;
        phoneChanged: boolean;
    }>;
}
