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
exports.SalaryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const salary_service_1 = require("./salary.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let SalaryController = class SalaryController {
    constructor(service) {
        this.service = service;
    }
    getMySalary(userId) {
        return this.service.getMySalary(userId);
    }
    getAllSalaries() {
        return this.service.getAllSalaries();
    }
};
exports.SalaryController = SalaryController;
__decorate([
    (0, common_1.Get)('my'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Get current teacher salary based on active students' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SalaryController.prototype, "getMySalary", null);
__decorate([
    (0, common_1.Get)('teachers'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get salary for all teachers' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SalaryController.prototype, "getAllSalaries", null);
exports.SalaryController = SalaryController = __decorate([
    (0, swagger_1.ApiTags)('salary'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('salary'),
    __metadata("design:paramtypes", [salary_service_1.SalaryService])
], SalaryController);
//# sourceMappingURL=salary.controller.js.map