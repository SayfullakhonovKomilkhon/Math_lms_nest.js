import { AttendanceStatus, LessonType } from '@prisma/client';
export declare class AttendanceRecordDto {
    studentId: string;
    status: AttendanceStatus;
}
export declare class BulkAttendanceDto {
    groupId: string;
    date: string;
    lessonType: LessonType;
    records: AttendanceRecordDto[];
}
