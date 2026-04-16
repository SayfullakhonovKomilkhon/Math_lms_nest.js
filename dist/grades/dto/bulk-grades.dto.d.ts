export declare class GradeRecordDto {
    studentId: string;
    score?: number | null;
    comment?: string;
}
export declare class BulkGradesDto {
    groupId: string;
    date: string;
    lessonType: 'PRACTICE' | 'CONTROL' | 'TEST';
    maxScore: number;
    records: GradeRecordDto[];
}
