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
exports.StudentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const students_service_1 = require("./students.service");
const create_student_dto_1 = require("./dto/create-student.dto");
const update_student_dto_1 = require("./dto/update-student.dto");
const update_my_profile_dto_1 = require("./dto/update-my-profile.dto");
const assign_group_dto_1 = require("./dto/assign-group.dto");
const update_group_fee_dto_1 = require("./dto/update-group-fee.dto");
const update_credentials_dto_1 = require("./dto/update-credentials.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let StudentsController = class StudentsController {
    constructor(studentsService) {
        this.studentsService = studentsService;
    }
    create(dto, actorId) {
        return this.studentsService.create(dto, actorId);
    }
    findAll() {
        return this.studentsService.findAll();
    }
    getMyProfile(userId) {
        return this.studentsService.findMyProfile(userId);
    }
    updateMyProfile(userId, dto) {
        return this.studentsService.updateMyProfile(userId, dto);
    }
    findOne(id, user) {
        return this.studentsService.findOne(id, user);
    }
    update(id, dto, actorId) {
        return this.studentsService.update(id, dto, actorId);
    }
    addGroup(id, dto, actorId) {
        return this.studentsService.addGroup(id, dto, actorId);
    }
    updateGroupFee(id, groupId, dto, actorId) {
        return this.studentsService.updateGroupFee(id, groupId, dto.monthlyFee, actorId);
    }
    removeGroup(id, groupId, actorId) {
        return this.studentsService.removeGroup(id, groupId, actorId);
    }
    assignGroup(id, dto, actorId) {
        return this.studentsService.addGroup(id, dto, actorId);
    }
    removeFromGroup(id, actorId) {
        return this.studentsService.removeFromAllGroups(id, actorId);
    }
    deactivate(id, actorId) {
        return this.studentsService.deactivate(id, actorId);
    }
    updateCredentials(id, dto, actorId) {
        return this.studentsService.updateCredentials(id, dto, actorId);
    }
};
exports.StudentsController = StudentsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new student' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_student_dto_1.CreateStudentDto, String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all students' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get own student profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Update own account data (name, phone, password)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_my_profile_dto_1.UpdateMyProfileDto]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN, client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Get student by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update student' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_student_dto_1.UpdateStudentDto, String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/groups'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Add student to a group with a per-link monthlyFee',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_group_dto_1.AssignGroupDto, String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "addGroup", null);
__decorate([
    (0, common_1.Patch)(':id/groups/:groupId'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update the per-link monthlyFee for one group' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_group_fee_dto_1.UpdateGroupFeeDto, String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "updateGroupFee", null);
__decorate([
    (0, common_1.Delete)(':id/groups/:groupId'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Remove student from a single group' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('groupId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "removeGroup", null);
__decorate([
    (0, common_1.Patch)(':id/group'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: '[Legacy] Add student to a group. Prefer POST /students/:id/groups.',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_group_dto_1.AssignGroupDto, String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "assignGroup", null);
__decorate([
    (0, common_1.Patch)(':id/remove-group'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: '[Legacy] Remove student from ALL groups. Prefer DELETE /students/:id/groups/:groupId.',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "removeFromGroup", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate student' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Patch)(':id/credentials'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Reset student phone and/or password (no old password required)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_credentials_dto_1.UpdateCredentialsDto, String]),
    __metadata("design:returntype", void 0)
], StudentsController.prototype, "updateCredentials", null);
exports.StudentsController = StudentsController = __decorate([
    (0, swagger_1.ApiTags)('students'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('students'),
    __metadata("design:paramtypes", [students_service_1.StudentsService])
], StudentsController);
//# sourceMappingURL=students.controller.js.map