export declare enum ReportFormat {
    EXCEL = "excel",
    PDF = "pdf"
}
export declare class PaymentsReportQueryDto {
    from?: string;
    to?: string;
    groupId?: string;
    status?: string;
}
export declare class StudentsReportQueryDto {
    groupId?: string;
    isActive?: string;
}
export declare class AttendanceReportQueryDto {
    from?: string;
    to?: string;
    groupId?: string;
}
export declare class DateRangeQueryDto {
    from?: string;
    to?: string;
}
