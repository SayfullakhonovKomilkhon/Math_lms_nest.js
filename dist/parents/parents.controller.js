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
exports.ParentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const client_1 = require("@prisma/client");
const parents_service_1 = require("./parents.service");
const create_parent_dto_1 = require("./dto/create-parent.dto");
const update_parent_dto_1 = require("./dto/update-parent.dto");
const update_credentials_dto_1 = require("./dto/update-credentials.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const upload_throttle_guard_1 = require("../common/guards/upload-throttle.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let ParentsController = class ParentsController {
    constructor(parentsService) {
        this.parentsService = parentsService;
    }
    findAll(search) {
        return this.parentsService.findAll({ search });
    }
    create(dto, actorId) {
        return this.parentsService.create(dto, actorId);
    }
    getMyProfile(userId) {
        return this.parentsService.findMyProfile(userId);
    }
    getChildAttendance(query, userId) {
        return this.parentsService.getChildAttendance(userId, query);
    }
    getChildGrades(query, userId) {
        return this.parentsService.getChildGrades(userId, query);
    }
    getChildHomework(query, userId) {
        return this.parentsService.getChildHomework(userId, query);
    }
    getChildPayments(query, userId) {
        return this.parentsService.getChildPayments(userId, query);
    }
    getChildRating(query, userId) {
        return this.parentsService.getChildRating(userId, query);
    }
    uploadChildReceipt(file, studentId, userId) {
        return this.parentsService.uploadChildReceipt(userId, file, studentId);
    }
    findOne(id) {
        return this.parentsService.findOne(id);
    }
    update(id, dto, actorId) {
        return this.parentsService.update(id, dto, actorId);
    }
    updateCredentials(id, dto, actorId) {
        return this.parentsService.updateCredentials(id, dto, actorId);
    }
    linkStudent(id, studentId, actorId) {
        return this.parentsService.linkStudent(id, studentId, actorId);
    }
    unlinkStudent(id, studentId, actorId) {
        return this.parentsService.unlinkStudent(id, studentId, actorId);
    }
};
exports.ParentsController = ParentsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List all parents' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    __param(0, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new parent' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_parent_dto_1.CreateParentDto, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)(client_1.Role.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get own parent profile + linked children' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)('me/child/attendance'),
    (0, roles_decorator_1.Roles)(client_1.Role.PARENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Get child attendance (?studentId= picks which child)',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "getChildAttendance", null);
__decorate([
    (0, common_1.Get)('me/child/grades'),
    (0, roles_decorator_1.Roles)(client_1.Role.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get child grades' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "getChildGrades", null);
__decorate([
    (0, common_1.Get)('me/child/homework'),
    (0, roles_decorator_1.Roles)(client_1.Role.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get child homework' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "getChildHomework", null);
__decorate([
    (0, common_1.Get)('me/child/payments'),
    (0, roles_decorator_1.Roles)(client_1.Role.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get child payment history' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "getChildPayments", null);
__decorate([
    (0, common_1.Get)('me/child/rating'),
    (0, roles_decorator_1.Roles)(client_1.Role.PARENT),
    (0, swagger_1.ApiOperation)({
        summary: "Get child's place in the group rating (mirrors /grades/my/rating)",
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "getChildRating", null);
__decorate([
    (0, common_1.Post)('me/child/payments/receipt'),
    (0, roles_decorator_1.Roles)(client_1.Role.PARENT),
    (0, common_1.UseGuards)(upload_throttle_guard_1.UploadThrottleGuard),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 1000 * 60 * 60 } }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                studentId: { type: 'string' },
            },
            required: ['file'],
        },
    }),
    (0, swagger_1.ApiOperation)({ summary: 'Upload payment receipt for child' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('studentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "uploadChildReceipt", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get parent by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update parent profile' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_parent_dto_1.UpdateParentDto, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/credentials'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Reset parent phone and/or password (no old password required)',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_credentials_dto_1.UpdateParentCredentialsDto, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "updateCredentials", null);
__decorate([
    (0, common_1.Post)(':id/students/:studentId'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Link a student (child) to this parent' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "linkStudent", null);
__decorate([
    (0, common_1.Delete)(':id/students/:studentId'),
    (0, roles_decorator_1.Roles)(client_1.Role.SUPER_ADMIN, client_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Unlink a student (child) from this parent' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ParentsController.prototype, "unlinkStudent", null);
exports.ParentsController = ParentsController = __decorate([
    (0, swagger_1.ApiTags)('parents'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('parents'),
    __metadata("design:paramtypes", [parents_service_1.ParentsService])
], ParentsController);
//# sourceMappingURL=parents.controller.js.map