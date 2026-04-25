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
exports.GamificationController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const gamification_service_1 = require("./gamification.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
class CalculateDto {
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CalculateDto.prototype, "month", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(2020),
    __metadata("design:type", Number)
], CalculateDto.prototype, "year", void 0);
let GamificationController = class GamificationController {
    constructor(gamificationService, prisma) {
        this.gamificationService = gamificationService;
        this.prisma = prisma;
    }
    async getMy(req) {
        const student = await this.prisma.student.findUnique({
            where: { userId: req.user.id },
        });
        if (!student)
            return null;
        return this.gamificationService.getStudentAchievements(student.id);
    }
    async getStudentAchievements(id, req) {
        if (req.user.role === client_1.Role.PARENT) {
            const link = await this.prisma.parentStudent.findFirst({
                where: { studentId: id, parent: { userId: req.user.id } },
                select: { parentId: true },
            });
            if (!link) {
                return null;
            }
        }
        return this.gamificationService.getStudentAchievements(id);
    }
    async getGroupAchievements(groupId, req) {
        if (req.user.role === client_1.Role.TEACHER) {
            const teacher = await this.prisma.teacher.findUnique({
                where: { userId: req.user.id },
            });
            const group = await this.prisma.group.findUnique({
                where: { id: groupId },
            });
            if (!teacher || group?.teacherId !== teacher.id) {
                return [];
            }
        }
        return this.gamificationService.getGroupAchievements(groupId);
    }
    async getCenterTop() {
        return this.gamificationService.getCenterTopStudents(10);
    }
    async calculate(dto) {
        return this.gamificationService.calculateMonthlyAchievements(dto.month, dto.year);
    }
};
exports.GamificationController = GamificationController;
__decorate([
    (0, common_1.Get)('my'),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getMy", null);
__decorate([
    (0, common_1.Get)('student/:id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN, client_1.Role.TEACHER, client_1.Role.PARENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getStudentAchievements", null);
__decorate([
    (0, common_1.Get)('group/:groupId'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getGroupAchievements", null);
__decorate([
    (0, common_1.Get)('center/top'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "getCenterTop", null);
__decorate([
    (0, common_1.Post)('calculate'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CalculateDto]),
    __metadata("design:returntype", Promise)
], GamificationController.prototype, "calculate", null);
exports.GamificationController = GamificationController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('achievements'),
    __metadata("design:paramtypes", [gamification_service_1.GamificationService,
        prisma_service_1.PrismaService])
], GamificationController);
//# sourceMappingURL=gamification.controller.js.map