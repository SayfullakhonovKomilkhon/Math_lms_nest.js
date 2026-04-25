"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const reports_service_1 = require("./reports.service");
const reports_query_dto_1 = require("./dto/reports-query.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
function sendFile(res, buf, mime, filename) {
    res.set({
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buf.length,
    });
    res.end(buf);
}
let ReportsController = class ReportsController {
    constructor(service) {
        this.service = service;
    }
    async financeExcel(query, res) {
        const buf = await this.service.financeExcel(query);
        sendFile(res, buf, XLSX_MIME, `finance-${today()}.xlsx`);
    }
    async financePdf(query, res) {
        const buf = await this.service.financePdf(query);
        sendFile(res, buf, 'application/pdf', `finance-${today()}.pdf`);
    }
    async paymentsExcel(query, res) {
        const buf = await this.service.paymentsExcel(query);
        sendFile(res, buf, XLSX_MIME, `payments-${today()}.xlsx`);
    }
    async paymentsPdf(query, res) {
        const buf = await this.service.paymentsPdf(query);
        sendFile(res, buf, 'application/pdf', `payments-${today()}.pdf`);
    }
    async studentsExcel(query, res) {
        const buf = await this.service.studentsExcel(query);
        sendFile(res, buf, XLSX_MIME, `students-${today()}.xlsx`);
    }
    async attendanceExcel(query, res) {
        const buf = await this.service.attendanceExcel(query);
        sendFile(res, buf, XLSX_MIME, `attendance-${today()}.xlsx`);
    }
    async gradesExcel(query, res) {
        const buf = await this.service.gradesExcel(query);
        sendFile(res, buf, XLSX_MIME, `grades-${today()}.xlsx`);
    }
    async salaryExcel(query, res) {
        const buf = await this.service.salaryExcel(query);
        sendFile(res, buf, XLSX_MIME, `salary-${today()}.xlsx`);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('finance/excel'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export finance report to Excel (3 sheets)' }),
    (0, swagger_1.ApiProduces)(XLSX_MIME),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.PaymentsReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "financeExcel", null);
__decorate([
    (0, common_1.Get)('finance/pdf'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export finance report to PDF' }),
    (0, swagger_1.ApiProduces)('application/pdf'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.PaymentsReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "financePdf", null);
__decorate([
    (0, common_1.Get)('payments/excel'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export payments to Excel (.xlsx)' }),
    (0, swagger_1.ApiProduces)(XLSX_MIME),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.PaymentsReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "paymentsExcel", null);
__decorate([
    (0, common_1.Get)('payments/pdf'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export payments to PDF' }),
    (0, swagger_1.ApiProduces)('application/pdf'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.PaymentsReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "paymentsPdf", null);
__decorate([
    (0, common_1.Get)('students/excel'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export students list to Excel (.xlsx)' }),
    (0, swagger_1.ApiProduces)(XLSX_MIME),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.StudentsReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "studentsExcel", null);
__decorate([
    (0, common_1.Get)('attendance/excel'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Export attendance records to Excel (with group summary)',
    }),
    (0, swagger_1.ApiProduces)(XLSX_MIME),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.AttendanceReportQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "attendanceExcel", null);
__decorate([
    (0, common_1.Get)('grades/excel'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export grades to Excel (grades + rating sheets)' }),
    (0, swagger_1.ApiProduces)(XLSX_MIME),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.DateRangeQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "gradesExcel", null);
__decorate([
    (0, common_1.Get)('salary/excel'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Export salary report to Excel' }),
    (0, swagger_1.ApiProduces)(XLSX_MIME),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.DateRangeQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "salaryExcel", null);
exports.ReportsController = ReportsController = __decorate([
    (0, swagger_1.ApiTags)('reports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
function today() {
    return new Date().toISOString().slice(0, 10);
}
//# sourceMappingURL=reports.controller.js.map