import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkGradesDto } from './dto/bulk-grades.dto';
import { EditGradeDto } from './dto/edit-grade.dto';
import { QueryGradesDto, RatingQueryDto } from './dto/query-grades.dto';
export declare class GradesService {
    private prisma;
    constructor(prisma: PrismaService);
    private getTeacherOrThrow;
    private assertTeacherOwnsGroup;
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
        date: Date;
        studentId: string;
        lessonType: import(".prisma/client").$Enums.LessonType;
        score: Prisma.Decimal;
        comment: string | null;
        maxScore: Prisma.Decimal;
        gradedAt: Date;
    })[]>;
    update(id: string, dto: EditGradeDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        groupId: string;
        date: Date;
        studentId: string;
        lessonType: import(".prisma/client").$Enums.LessonType;
        score: Prisma.Decimal;
        comment: string | null;
        maxScore: Prisma.Decimal;
        gradedAt: Date;
    }>;
    getRating(groupId: string, query: RatingQueryDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        studentId: string;
        fullName: string;
        totalPoints: number;
        averageScore: number;
        totalWorks: number;
        attendancePercent: number;
        place: number;
    }[]>;
    getStudentAverage(studentId: string, query: {
        from?: string;
        to?: string;
        lessonType?: string;
    }, user: {
        id: string;
        role: Role;
        studentId?: string;
    }): Promise<{
        averageScore: number;
        totalWorks: number;
    }>;
    findMy(query: {
        lessonType?: string;
        from?: string;
        to?: string;
    }, userId: string): Promise<{
        scorePercent: number;
        groupName: string;
        group: {
            name: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        groupId: string;
        date: Date;
        studentId: string;
        lessonType: import(".prisma/client").$Enums.LessonType;
        score: Prisma.Decimal;
        comment: string | null;
        maxScore: Prisma.Decimal;
        gradedAt: Date;
    }[]>;
    findMyStats(userId: string): Promise<{
        averageScore: number;
        totalWorks: number;
        byMonth: {
            month: string;
            averageScore: number;
        }[];
        byType: {
            lessonType: string;
            averageScore: number;
            count: number;
        }[];
    }>;
    findMyRating(query: {
        period?: 'month' | 'quarter' | 'all';
    }, userId: string): Promise<{
        myPlace: number;
        totalStudents: number;
        myAverageScore: number;
        isVisible: boolean;
        rating: never[];
        myTotalPoints?: undefined;
    } | {
        myPlace: number;
        totalStudents: number;
        myAverageScore: number;
        myTotalPoints: number;
        isVisible: boolean;
        rating: {
            studentId: string;
            fullName: string;
            totalPoints: number;
            averageScore: number;
            totalWorks: number;
            attendancePercent: number;
            place: number;
        }[];
    }>;
}
