import { Role } from '@prisma/client';
import { GradesService } from './grades.service';
import { BulkGradesDto } from './dto/bulk-grades.dto';
import { EditGradeDto } from './dto/edit-grade.dto';
import { QueryGradesDto, RatingQueryDto } from './dto/query-grades.dto';
export declare class GradesController {
    private service;
    constructor(service: GradesService);
    bulkCreate(dto: BulkGradesDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        created: number;
    }>;
    findAll(query: QueryGradesDto, user: {
        id: string;
        role: Role;
    }): Promise<({
        student: {
            id: string;
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        groupId: string;
        studentId: string;
        date: Date;
        lessonType: import(".prisma/client").$Enums.LessonType;
        score: import("@prisma/client/runtime/library").Decimal;
        comment: string | null;
        maxScore: import("@prisma/client/runtime/library").Decimal;
        gradedAt: Date;
    })[]>;
    getRating(groupId: string, query: RatingQueryDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        studentId: string;
        fullName: string;
        averageScore: number;
        totalWorks: number;
        attendancePercent: number;
        place: number;
    }[]>;
    getAverage(studentId: string, query: {
        from?: string;
        to?: string;
        lessonType?: string;
    }, user: {
        id: string;
        role: Role;
    }): Promise<{
        averageScore: number;
        totalWorks: number;
    }>;
    update(id: string, dto: EditGradeDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        groupId: string;
        studentId: string;
        date: Date;
        lessonType: import(".prisma/client").$Enums.LessonType;
        score: import("@prisma/client/runtime/library").Decimal;
        comment: string | null;
        maxScore: import("@prisma/client/runtime/library").Decimal;
        gradedAt: Date;
    }>;
}
