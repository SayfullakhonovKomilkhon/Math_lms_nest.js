import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { EditAttendanceDto } from './dto/edit-attendance.dto';
import { QueryAttendanceDto, SummaryQueryDto } from './dto/query-attendance.dto';
export declare class AttendanceService {
    private prisma;
    constructor(prisma: PrismaService);
    private assertTeacherOwnsGroup;
    bulkCreate(dto: BulkAttendanceDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        saved: number;
    }>;
    findAll(query: QueryAttendanceDto, user: {
        id: string;
        role: Role;
    }): Promise<({
        student: {
            id: string;
            fullName: string;
        };
        group: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        groupId: string;
        studentId: string;
        date: Date;
        lessonType: import(".prisma/client").$Enums.LessonType;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        editedAt: Date | null;
        editReason: string | null;
    })[]>;
    findMy(query: {
        from?: string;
        to?: string;
        groupId?: string;
    }, userId: string): Promise<({
        group: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        groupId: string;
        studentId: string;
        date: Date;
        lessonType: import(".prisma/client").$Enums.LessonType;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        editedAt: Date | null;
        editReason: string | null;
    })[]>;
    update(id: string, dto: EditAttendanceDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        createdAt: Date;
        groupId: string;
        studentId: string;
        date: Date;
        lessonType: import(".prisma/client").$Enums.LessonType;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        editedAt: Date | null;
        editReason: string | null;
    }>;
    getSummary(query: SummaryQueryDto, user: {
        id: string;
        role: Role;
    }): Promise<{
        totalLessons: number;
        percentage: number;
        studentId: string;
        fullName: string;
        present: number;
        absent: number;
        late: number;
    }[]>;
}
