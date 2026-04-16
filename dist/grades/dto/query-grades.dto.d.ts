import { LessonType } from '@prisma/client';
export declare class QueryGradesDto {
    groupId?: string;
    studentId?: string;
    lessonType?: LessonType;
    from?: string;
    to?: string;
}
export declare class RatingQueryDto {
    period?: 'month' | 'quarter' | 'all';
}
