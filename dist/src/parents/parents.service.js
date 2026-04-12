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
exports.ParentsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const parentSelect = {
    id: true,
    fullName: true,
    phone: true,
    createdAt: true,
    updatedAt: true,
    user: { select: { id: true, email: true, role: true, isActive: true } },
    student: { select: { id: true, fullName: true, groupId: true } },
};
let ParentsService = class ParentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, actorId) {
        const student = await this.prisma.student.findUnique({
            where: { id: dto.studentId },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const parent = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    passwordHash,
                    role: client_1.Role.PARENT,
                },
            });
            return tx.parent.create({
                data: {
                    userId: user.id,
                    fullName: dto.fullName,
                    phone: dto.phone,
                    studentId: dto.studentId,
                },
                select: parentSelect,
            });
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'CREATE',
                entity: 'Parent',
                entityId: parent.id,
                details: { email: dto.email, studentId: dto.studentId },
            },
        });
        return parent;
    }
    async findOne(id) {
        const parent = await this.prisma.parent.findUnique({
            where: { id },
            select: parentSelect,
        });
        if (!parent) {
            throw new common_1.NotFoundException('Parent not found');
        }
        return parent;
    }
    async findMyProfile(userId) {
        const parent = await this.prisma.parent.findUnique({
            where: { userId },
            select: parentSelect,
        });
        if (!parent) {
            throw new common_1.NotFoundException('Parent profile not found');
        }
        return parent;
    }
    async update(id, dto, actorId) {
        const existing = await this.prisma.parent.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Parent not found');
        }
        return this.prisma.parent.update({
            where: { id },
            data: dto,
            select: parentSelect,
        });
    }
};
exports.ParentsService = ParentsService;
exports.ParentsService = ParentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ParentsService);
//# sourceMappingURL=parents.service.js.map