import { PrismaService } from '../prisma/prisma.service';
import { DateRangeQueryDto, RevenueQueryDto, StudentsGrowthQueryDto } from './dto/analytics-query.dto';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<{
        totalStudents: number;
        totalGroups: number;
        totalTeachers: number;
        newStudentsThisWeek: number;
        debtorsCount: number;
        currentMonthRevenue: number;
        lastMonthRevenue: number;
        nextMonthForecast: number;
        centerAttendancePercent: number;
    }>;
    getRevenue(query: RevenueQueryDto): Promise<{
        month: string;
        revenue: number;
        studentsCount: number;
    }[]>;
    getStudentsGrowth(query: StudentsGrowthQueryDto): Promise<{
        date: string;
        newStudents: number;
        totalStudents: number;
    }[]>;
    getAttendanceCenter(query: DateRangeQueryDto): Promise<{
        overall: {
            present: number;
            absent: number;
            late: number;
            percentage: number;
        };
        byGroup: {
            groupId: string;
            groupName: string;
            teacherName: string;
            totalLessons: number;
            percentage: number;
        }[];
        byMonth: {
            month: string;
            percentage: number;
        }[];
    }>;
    getGradesCenter(query: DateRangeQueryDto): Promise<{
        centerAverage: number;
        byGroup: {
            groupId: string;
            groupName: string;
            teacherName: string;
            averageScore: number;
            totalWorks: number;
        }[];
        byTeacher: {
            teacherId: string;
            teacherName: string;
            groupsCount: number;
            studentsCount: number;
            averageScore: number;
        }[];
        topStudents: {
            studentId: string;
            fullName: string;
            groupName: string;
            averageScore: number;
            totalWorks: number;
        }[];
        byMonth: {
            month: string;
            averageScore: number;
        }[];
    }>;
    getDebtors(): Promise<{
        studentId: string;
        fullName: string;
        groupName: string;
        teacherName: string;
        monthlyFee: number;
        lastPaymentDate: string | null;
        daysSinceLastPayment: number | null;
        parentPhone: string | null;
    }[]>;
    getTeachersLoad(): Promise<{
        teacherId: string;
        fullName: string;
        phone: string | null;
        groupsCount: number;
        studentsCount: number;
        ratePerStudent: number;
        totalSalary: number;
        attendancePercent: number;
    }[]>;
}
