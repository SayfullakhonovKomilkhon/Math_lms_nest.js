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
exports.AttendanceController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const attendance_service_1 = require("./attendance.service");
const bulk_attendance_dto_1 = require("./dto/bulk-attendance.dto");
const edit_attendance_dto_1 = require("./dto/edit-attendance.dto");
const query_attendance_dto_1 = require("./dto/query-attendance.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AttendanceController = class AttendanceController {
    constructor(service) {
        this.service = service;
    }
    bulkCreate(dto, user) {
        return this.service.bulkCreate(dto, user);
    }
    findAll(query, user) {
        return this.service.findAll(query, user);
    }
    getSummary(query, user) {
        return this.service.getSummary(query, user);
    }
    update(id, dto, user) {
        return this.service.update(id, dto, user);
    }
};
exports.AttendanceController = AttendanceController;
__decorate([
    (0, common_1.Post)('bulk'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk mark attendance for a group lesson' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [bulk_attendance_dto_1.BulkAttendanceDto, Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance records' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_attendance_dto_1.QueryAttendanceDto, Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get attendance summary for a group' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_attendance_dto_1.SummaryQueryDto, Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Edit attendance record with reason' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, edit_attendance_dto_1.EditAttendanceDto, Object]),
    __metadata("design:returntype", void 0)
], AttendanceController.prototype, "update", null);
exports.AttendanceController = AttendanceController = __decorate([
    (0, swagger_1.ApiTags)('attendance'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('attendance'),
    __metadata("design:paramtypes", [attendance_service_1.AttendanceService])
], AttendanceController);
//# sourceMappingURL=attendance.controller.js.map