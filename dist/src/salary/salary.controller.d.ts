import { SalaryService } from './salary.service';
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
}
