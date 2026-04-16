import { Response } from 'express';
import { ReportsService } from './reports.service';
import { AttendanceReportQueryDto, DateRangeQueryDto, PaymentsReportQueryDto, StudentsReportQueryDto } from './dto/reports-query.dto';
export declare class ReportsController {
    private service;
    constructor(service: ReportsService);
    financeExcel(query: PaymentsReportQueryDto, res: Response): Promise<void>;
    financePdf(query: PaymentsReportQueryDto, res: Response): Promise<void>;
    paymentsExcel(query: PaymentsReportQueryDto, res: Response): Promise<void>;
    paymentsPdf(query: PaymentsReportQueryDto, res: Response): Promise<void>;
    studentsExcel(query: StudentsReportQueryDto, res: Response): Promise<void>;
    attendanceExcel(query: AttendanceReportQueryDto, res: Response): Promise<void>;
    gradesExcel(query: DateRangeQueryDto, res: Response): Promise<void>;
    salaryExcel(query: DateRangeQueryDto, res: Response): Promise<void>;
}
