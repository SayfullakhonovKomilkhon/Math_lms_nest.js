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
exports.TelegramController = void 0;
const common_1 = require("@nestjs/common");
const telegram_service_1 = require("./telegram.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let TelegramController = class TelegramController {
    constructor(telegramService, prisma) {
        this.telegramService = telegramService;
        this.prisma = prisma;
    }
    generateCode(req) {
        const code = this.telegramService.generateCode(req.user.id);
        return {
            code,
            botUsername: process.env.TELEGRAM_BOT_USERNAME ?? 'mathcenter_bot',
        };
    }
    async status(req) {
        const user = await this.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { telegramChatId: true },
        });
        return { linked: Boolean(user?.telegramChatId) };
    }
    async unlink(req) {
        await this.prisma.user.update({
            where: { id: req.user.id },
            data: { telegramChatId: null },
        });
        return { success: true };
    }
};
exports.TelegramController = TelegramController;
__decorate([
    (0, common_1.Post)('generate-code'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TelegramController.prototype, "generateCode", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelegramController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('unlink'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TelegramController.prototype, "unlink", null);
exports.TelegramController = TelegramController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.STUDENT, client_1.Role.PARENT, client_1.Role.TEACHER, client_1.Role.ADMIN, client_1.Role.SUPER_ADMIN),
    (0, common_1.Controller)('telegram'),
    __metadata("design:paramtypes", [telegram_service_1.TelegramService,
        prisma_service_1.PrismaService])
], TelegramController);
//# sourceMappingURL=telegram.controller.js.map