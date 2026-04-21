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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('Email already in use');
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: { email: dto.email, passwordHash, role: dto.role, telegramChatId: dto.telegramChatId },
        });
        const { passwordHash: _, ...result } = user;
        return result;
    }
    async findAll(role) {
        return this.prisma.user.findMany({
            where: role ? { role: role } : undefined,
            select: {
                id: true, email: true, role: true, isActive: true,
                telegramChatId: true, createdAt: true, updatedAt: true,
                teacher: { select: { id: true, fullName: true, phone: true, ratePerStudent: true } },
            },
        });
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, role: true, isActive: true, telegramChatId: true, createdAt: true, updatedAt: true },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async getStaff() {
        const [teachers, admins] = await Promise.all([
            this.prisma.teacher.findMany({
                include: {
                    user: { select: { id: true, email: true, isActive: true, createdAt: true } },
                    groups: {
                        where: { isActive: true },
                        include: { _count: { select: { students: { where: { isActive: true } } } } },
                    },
                },
                orderBy: { fullName: 'asc' },
            }),
            this.prisma.user.findMany({
                where: { role: client_1.Role.ADMIN },
                select: { id: true, email: true, isActive: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return {
            teachers: teachers.map((t) => ({
                id: t.id,
                userId: t.userId,
                fullName: t.fullName,
                phone: t.phone,
                email: t.user.email,
                isActive: t.isActive,
                ratePerStudent: Number(t.ratePerStudent),
                studentsCount: t.groups.reduce((s, g) => s + g._count.students, 0),
                createdAt: t.user.createdAt,
            })),
            admins: admins.map((a) => ({
                id: a.id,
                fullName: null,
                email: a.email,
                isActive: a.isActive,
                createdAt: a.createdAt,
            })),
        };
    }
    async createStaff(dto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('Email already in use');
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email: dto.email,
                    passwordHash,
                    role: dto.role,
                },
            });
            if (dto.role === 'TEACHER') {
                await tx.teacher.create({
                    data: {
                        userId: newUser.id,
                        fullName: dto.fullName ?? dto.email,
                        phone: dto.phone ?? null,
                    },
                });
            }
            return newUser;
        });
        const { passwordHash: _, ...result } = user;
        return result;
    }
    async updateCredentials(id, dto, actorId) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const data = {};
        if (dto.email && dto.email !== user.email) {
            const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (exists && exists.id !== id) {
                throw new common_1.ConflictException('Email already in use');
            }
            data.email = dto.email;
        }
        if (dto.password) {
            data.passwordHash = await bcrypt.hash(dto.password, 10);
        }
        if (Object.keys(data).length === 0) {
            const { passwordHash: _, ...rest } = user;
            return rest;
        }
        const updated = await this.prisma.user.update({
            where: { id },
            data,
            select: { id: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UPDATE_USER',
                entity: 'User',
                entityId: id,
                details: {
                    emailChanged: Boolean(data.email),
                    passwordChanged: Boolean(data.passwordHash),
                },
            },
        });
        return updated;
    }
    async deactivate(id, actorId) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const updated = await this.prisma.user.update({
            where: { id },
            data: { isActive: false },
            select: { id: true, email: true, role: true, isActive: true },
        });
        await this.prisma.auditLog.create({
            data: { userId: actorId, action: 'DEACTIVATE_USER', entity: 'User', entityId: id },
        });
        return updated;
    }
    async getAuditLog(params) {
        const where = {};
        if (params.action)
            where.action = { contains: params.action, mode: 'insensitive' };
        if (params.userId)
            where.userId = params.userId;
        if (params.from || params.to) {
            where.createdAt = {};
            if (params.from)
                where.createdAt.gte = new Date(params.from);
            if (params.to)
                where.createdAt.lte = new Date(params.to);
        }
        const [total, records] = await Promise.all([
            this.prisma.auditLog.count({ where }),
            this.prisma.auditLog.findMany({
                where,
                take: params.limit,
                skip: params.offset,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { email: true, role: true } } },
            }),
        ]);
        return { total, records };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map