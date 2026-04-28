"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tokens = await this.generateTokens(user.id, user.phone, user.role);
        await this.saveRefreshToken(user.id, tokens.refreshToken);
        return {
            ...tokens,
            user: {
                id: user.id,
                phone: user.phone,
                role: user.role,
                telegramChatId: user.telegramChatId,
            },
        };
    }
    async refresh(userId, refreshToken) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
        });
        if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        await this.prisma.refreshToken.delete({ where: { token: refreshToken } });
        const tokens = await this.generateTokens(user.id, user.phone, user.role);
        await this.saveRefreshToken(user.id, tokens.refreshToken);
        return tokens;
    }
    async getMe(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                telegramChatId: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async updateMe(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.isActive) {
            throw new common_1.NotFoundException('User not found or inactive');
        }
        const wantsPhoneChange = !!dto.phone && dto.phone !== user.phone;
        const wantsPasswordChange = !!dto.newPassword;
        if (!wantsPhoneChange && !wantsPasswordChange) {
            throw new common_1.BadRequestException('Nothing to update');
        }
        if (!dto.currentPassword) {
            throw new common_1.BadRequestException('Current password is required');
        }
        const passwordOk = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!passwordOk) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        if (wantsPhoneChange) {
            const clash = await this.prisma.user.findUnique({
                where: { phone: dto.phone },
            });
            if (clash && clash.id !== user.id) {
                throw new common_1.ConflictException('Phone is already in use');
            }
        }
        const data = {};
        if (wantsPhoneChange)
            data.phone = dto.phone;
        if (wantsPasswordChange) {
            data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                phone: true,
                role: true,
                isActive: true,
            },
        });
        await this.prisma.refreshToken.deleteMany({ where: { userId } });
        const tokens = await this.generateTokens(updated.id, updated.phone, updated.role);
        await this.saveRefreshToken(updated.id, tokens.refreshToken);
        return {
            user: updated,
            ...tokens,
        };
    }
    async logout(userId, refreshToken) {
        if (refreshToken) {
            await this.prisma.refreshToken.deleteMany({
                where: { token: refreshToken, userId },
            });
        }
        else {
            await this.prisma.refreshToken.deleteMany({ where: { userId } });
        }
    }
    async generateTokens(userId, phone, role) {
        const payload = { sub: userId, phone, role };
        const accessSecret = this.configService.get('jwt.accessSecret');
        const refreshSecret = this.configService.get('jwt.refreshSecret');
        const accessExpiresIn = this.configService.get('jwt.accessExpiresIn') ?? '15m';
        const refreshExpiresIn = this.configService.get('jwt.refreshExpiresIn') ?? '30d';
        const accessToken = this.jwtService.sign(payload, {
            secret: accessSecret,
            expiresIn: accessExpiresIn,
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: refreshSecret,
            expiresIn: refreshExpiresIn,
        });
        return { accessToken, refreshToken };
    }
    async saveRefreshToken(userId, token) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await this.prisma.refreshToken.create({
            data: { token, userId, expiresAt },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map