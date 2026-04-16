import { PrismaService } from '../prisma/prisma.service';
import { AttendanceReportQueryDto, DateRangeQueryDto, PaymentsReportQueryDto, StudentsReportQueryDto } from './dto/reports-query.dto';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    paymentsExcel(query: PaymentsReportQueryDto): Promise<Buffer>;
    financeExcel(query: PaymentsReportQueryDto): Promise<Buffer>;
    financePdf(query: PaymentsReportQueryDto): Promise<Buffer>;
    paymentsPdf(query: PaymentsReportQueryDto): Promise<Buffer>;
    studentsExcel(query: StudentsReportQueryDto): Promise<Buffer>;
    attendanceExcel(query: AttendanceReportQueryDto): Promise<Buffer>;
    gradesExcel(query: DateRangeQueryDto): Promise<Buffer>;
    salaryExcel(query: DateRangeQueryDto): Promise<Buffer>;
}
