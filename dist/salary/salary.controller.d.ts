import { SalaryService } from './salary.service';
declare class UpdateRateDto {
    rate: number;
}
export declare class SalaryController {
    private service;
    constructor(service: SalaryService);
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
    getHistory(id: string): Promise<{
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
    updateRate(id: string, dto: UpdateRateDto, actorId: string): Promise<{
        id: string;
        fullName: string;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
}
export {};
