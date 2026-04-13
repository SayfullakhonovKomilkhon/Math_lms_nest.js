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
const payments_service_1 = require("../payments/payments.service");
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
    constructor(prisma, paymentsService) {
        this.prisma = prisma;
        this.paymentsService = paymentsService;
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
            select: {
                id: true,
                fullName: true,
                phone: true,
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        gender: true,
                        enrolledAt: true,
                        group: {
                            select: {
                                id: true,
                                name: true,
                                schedule: true,
                                teacher: {
                                    select: { fullName: true, phone: true },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!parent) {
            throw new common_1.NotFoundException('Parent profile not found');
        }
        return parent;
    }
    async getChildByIdGuard(userId) {
        const parent = await this.prisma.parent.findUnique({ where: { userId } });
        if (!parent)
            throw new common_1.NotFoundException('Parent profile not found');
        return parent.studentId;
    }
    async getChildAttendance(userId, query) {
        const studentId = await this.getChildByIdGuard(userId);
        const where = { studentId };
        if (query.from || query.to) {
            where.date = {};
            if (query.from)
                where.date.gte = new Date(query.from);
            if (query.to)
                where.date.lte = new Date(query.to);
        }
        return this.prisma.attendance.findMany({
            where,
            include: { group: { select: { name: true } } },
            orderBy: { date: 'desc' },
        });
    }
    async getChildGrades(userId, query) {
        const studentId = await this.getChildByIdGuard(userId);
        const where = { studentId };
        if (query.lessonType)
            where.lessonType = query.lessonType;
        if (query.from || query.to) {
            where.date = {};
            if (query.from)
                where.date.gte = new Date(query.from);
            if (query.to)
                where.date.lte = new Date(query.to);
        }
        const grades = await this.prisma.grade.findMany({
            where,
            include: { group: { select: { name: true } } },
            orderBy: { date: 'desc' },
        });
        return grades.map((g) => ({
            ...g,
            scorePercent: Number(g.maxScore) > 0 ? Math.round((Number(g.score) / Number(g.maxScore)) * 100) : 0,
            groupName: g.group.name,
        }));
    }
    async getChildHomework(userId) {
        const studentId = await this.getChildByIdGuard(userId);
        const student = await this.prisma.student.findUnique({ where: { id: studentId } });
        if (!student || !student.groupId)
            return [];
        return this.prisma.homework.findMany({
            where: { groupId: student.groupId },
            orderBy: { createdAt: 'desc' },
            take: 6,
            include: {
                teacher: { select: { fullName: true } },
            },
        });
    }
    async getChildPayments(userId) {
        const studentId = await this.getChildByIdGuard(userId);
        const student = await this.prisma.student.findUnique({ where: { id: studentId } });
        return this.paymentsService.findMy(student.userId);
    }
    async uploadChildReceipt(userId, file) {
        const studentId = await this.getChildByIdGuard(userId);
        return this.paymentsService.uploadReceipt(file, studentId, userId);
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payments_service_1.PaymentsService])
], ParentsService);
//# sourceMappingURL=parents.service.js.map