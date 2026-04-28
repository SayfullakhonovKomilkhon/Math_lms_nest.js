import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
export declare class SalaryService {
    private prisma;
    private notificationsQueue;
    constructor(prisma: PrismaService, notificationsQueue: Queue);
    getMySalary(userId: string): Promise<{
        teacherId: string;
        fullName: string;
        studentCount: number;
        ratePerStudent: number;
        totalSalary: number;
        groups: {
            id: string;
            name: string;
            studentCount: number;
            groupSalary: number;
        }[];
    }>;
    getAllSalaries(): Promise<{
        teacherId: string;
        fullName: string;
        studentCount: number;
        ratePerStudent: number;
        totalSalary: number;
    }[]>;
    getHistory(teacherId: string): Promise<{
        teacherId: string;
        fullName: string;
        currentRate: number;
        history: {
            month: string;
            studentsCount: number;
            ratePerStudent: number;
            totalSalary: number;
        }[];
    }>;
    updateRate(teacherId: string, rate: number, actorId: string): Promise<{
        id: string;
        fullName: string;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
}
