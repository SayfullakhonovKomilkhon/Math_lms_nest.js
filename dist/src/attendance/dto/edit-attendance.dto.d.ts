import { AttendanceStatus } from '@prisma/client';
export declare class EditAttendanceDto {
    status: AttendanceStatus;
    editReason: string;
}
