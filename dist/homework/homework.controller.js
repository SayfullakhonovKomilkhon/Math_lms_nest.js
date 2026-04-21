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
exports.HomeworkController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const homework_service_1 = require("./homework.service");
const create_homework_dto_1 = require("./dto/create-homework.dto");
const update_homework_dto_1 = require("./dto/update-homework.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const s3_service_1 = require("../common/services/s3.service");
let HomeworkController = class HomeworkController {
    constructor(service, s3) {
        this.service = service;
        this.s3 = s3;
    }
    async uploadImage(file) {
        const url = await this.s3.uploadFile(file, 'homework');
        return { url };
    }
    create(dto, user) {
        return this.service.create(dto, user);
    }
    findAll(groupId, user) {
        return this.service.findAll(groupId, user);
    }
    findMy(limit, userId) {
        return this.service.findMy(limit ? parseInt(limit, 10) : 10, userId);
    }
    findMyLatest(userId) {
        return this.service.findMyLatest(userId);
    }
    findLatest(groupId, user) {
        return this.service.findLatest(groupId, user);
    }
    update(id, dto, user) {
        return this.service.update(id, dto, user);
    }
    remove(id, user) {
        return this.service.remove(id, user);
    }
};
exports.HomeworkController = HomeworkController;
__decorate([
    (0, common_1.Post)('upload-image'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } }),
    (0, swagger_1.ApiOperation)({ summary: 'Upload homework image to S3' }),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HomeworkController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Create homework for a group' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_homework_dto_1.CreateHomeworkDto, Object]),
    __metadata("design:returntype", void 0)
], HomeworkController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN, client_1.Role.STUDENT, client_1.Role.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get homework for a group' }),
    __param(0, (0, common_1.Query)('groupId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HomeworkController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get own homework' }),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HomeworkController.prototype, "findMy", null);
__decorate([
    (0, common_1.Get)('my/latest'),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest homework' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HomeworkController.prototype, "findMyLatest", null);
__decorate([
    (0, common_1.Get)('latest/:groupId'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN, client_1.Role.STUDENT, client_1.Role.PARENT),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest homework for a group' }),
    __param(0, (0, common_1.Param)('groupId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HomeworkController.prototype, "findLatest", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER),
    (0, swagger_1.ApiOperation)({ summary: 'Update homework' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_homework_dto_1.UpdateHomeworkDto, Object]),
    __metadata("design:returntype", void 0)
], HomeworkController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.Role.TEACHER, client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Delete homework' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HomeworkController.prototype, "remove", null);
exports.HomeworkController = HomeworkController = __decorate([
    (0, swagger_1.ApiTags)('homework'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('homework'),
    __metadata("design:paramtypes", [homework_service_1.HomeworkService,
        s3_service_1.S3Service])
], HomeworkController);
//# sourceMappingURL=homework.controller.js.map