import { PrismaService } from '../prisma/prisma.service';
export declare class SalaryService {
    private prisma;
    constructor(prisma: PrismaService);
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
}
