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
const grades_service_1 = require("../grades/grades.service");
const prisma_service_1 = require("../prisma/prisma.service");
const parentSummarySelect = {
    id: true,
    fullName: true,
    phone: true,
    createdAt: true,
    updatedAt: true,
    user: { select: { id: true, phone: true, role: true, isActive: true } },
};
let ParentsService = class ParentsService {
    constructor(prisma, paymentsService, gradesService) {
        this.prisma = prisma;
        this.paymentsService = paymentsService;
        this.gradesService = gradesService;
    }
    async getOwnChildIds(userId) {
        const parent = await this.prisma.parent.findUnique({
            where: { userId },
            select: {
                id: true,
                students: {
                    select: { studentId: true, createdAt: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!parent)
            throw new common_1.NotFoundException('Parent profile not found');
        return parent.students.map((s) => s.studentId);
    }
    async resolveChildId(userId, studentId) {
        const childIds = await this.getOwnChildIds(userId);
        if (childIds.length === 0) {
            throw new common_1.NotFoundException('No children linked to this parent');
        }
        if (studentId) {
            if (!childIds.includes(studentId)) {
                throw new common_1.ForbiddenException('This child does not belong to you');
            }
            return studentId;
        }
        return childIds[0];
    }
    childSelect() {
        return {
            id: true,
            fullName: true,
            gender: true,
            enrolledAt: true,
            isActive: true,
            groups: {
                orderBy: { joinedAt: 'asc' },
                select: {
                    monthlyFee: true,
                    joinedAt: true,
                    group: {
                        select: {
                            id: true,
                            name: true,
                            schedule: true,
                            teacher: { select: { fullName: true, phone: true } },
                        },
                    },
                },
            },
        };
    }
    shapeChild(child) {
        const groups = child.groups.map((link) => ({
            id: link.group.id,
            name: link.group.name,
            schedule: link.group.schedule,
            teacher: link.group.teacher,
            monthlyFee: Number(link.monthlyFee),
            joinedAt: link.joinedAt,
        }));
        const monthlyFee = groups.reduce((acc, g) => acc + g.monthlyFee, 0);
        const primary = groups[0] ?? null;
        const { groups: _omit, ...rest } = child;
        return {
            ...rest,
            monthlyFee,
            group: primary
                ? {
                    id: primary.id,
                    name: primary.name,
                    schedule: primary.schedule,
                    teacher: primary.teacher,
                }
                : null,
            groups,
        };
    }
    async create(dto, actorId) {
        const studentIds = Array.from(new Set([...(dto.studentIds ?? []), ...(dto.studentId ? [dto.studentId] : [])]));
        if (studentIds.length > 0) {
            const found = await this.prisma.student.findMany({
                where: { id: { in: studentIds } },
                select: { id: true },
            });
            if (found.length !== studentIds.length) {
                throw new common_1.NotFoundException('One or more students were not found');
            }
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Phone already in use');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const parent = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    phone: dto.phone,
                    passwordHash,
                    role: client_1.Role.PARENT,
                },
            });
            const created = await tx.parent.create({
                data: {
                    userId: user.id,
                    fullName: dto.fullName,
                    phone: dto.phone,
                },
            });
            if (studentIds.length > 0) {
                await tx.parentStudent.createMany({
                    data: studentIds.map((sid) => ({
                        parentId: created.id,
                        studentId: sid,
                    })),
                    skipDuplicates: true,
                });
            }
            return created;
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'CREATE',
                entity: 'Parent',
                entityId: parent.id,
                details: { phone: dto.phone, studentIds },
            },
        });
        return this.findOne(parent.id);
    }
    async findAll(query = {}) {
        const where = query.search
            ? {
                OR: [
                    {
                        fullName: {
                            contains: query.search,
                            mode: 'insensitive',
                        },
                    },
                    {
                        user: {
                            phone: {
                                contains: query.search,
                                mode: 'insensitive',
                            },
                        },
                    },
                    { phone: { contains: query.search } },
                ],
            }
            : {};
        const parents = await this.prisma.parent.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                ...parentSummarySelect,
                students: {
                    select: {
                        student: {
                            select: {
                                id: true,
                                fullName: true,
                                isActive: true,
                                groups: {
                                    orderBy: { joinedAt: 'asc' },
                                    take: 1,
                                    select: { group: { select: { id: true, name: true } } },
                                },
                            },
                        },
                    },
                },
            },
        });
        return parents.map((p) => ({
            ...p,
            students: p.students.map((s) => ({
                student: {
                    id: s.student.id,
                    fullName: s.student.fullName,
                    isActive: s.student.isActive,
                    group: s.student.groups[0]?.group ?? null,
                },
            })),
        }));
    }
    async findOne(id) {
        const parent = await this.prisma.parent.findUnique({
            where: { id },
            select: {
                ...parentSummarySelect,
                students: {
                    select: {
                        createdAt: true,
                        student: {
                            select: {
                                id: true,
                                fullName: true,
                                isActive: true,
                                groups: {
                                    orderBy: { joinedAt: 'asc' },
                                    take: 1,
                                    select: { group: { select: { id: true, name: true } } },
                                },
                            },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!parent)
            throw new common_1.NotFoundException('Parent not found');
        return {
            ...parent,
            students: parent.students.map((s) => ({
                createdAt: s.createdAt,
                student: {
                    id: s.student.id,
                    fullName: s.student.fullName,
                    isActive: s.student.isActive,
                    group: s.student.groups[0]?.group ?? null,
                },
            })),
        };
    }
    async update(id, dto, actorId) {
        const existing = await this.prisma.parent.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Parent not found');
        await this.prisma.parent.update({
            where: { id },
            data: dto,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UPDATE',
                entity: 'Parent',
                entityId: id,
                details: dto,
            },
        });
        return this.findOne(id);
    }
    async updateCredentials(parentId, payload, actorId) {
        const parent = await this.prisma.parent.findUnique({
            where: { id: parentId },
            select: { id: true, userId: true, user: { select: { phone: true } } },
        });
        if (!parent)
            throw new common_1.NotFoundException('Parent not found');
        const data = {};
        if (payload.phone && payload.phone !== parent.user.phone) {
            const existing = await this.prisma.user.findUnique({
                where: { phone: payload.phone },
            });
            if (existing && existing.id !== parent.userId) {
                throw new common_1.ConflictException('Phone already in use');
            }
            data.phone = payload.phone;
        }
        if (payload.password) {
            if (payload.password.length < 8) {
                throw new common_1.BadRequestException('Password must be at least 8 characters long');
            }
            data.passwordHash = await bcrypt.hash(payload.password, 10);
        }
        if (Object.keys(data).length === 0) {
            return { ok: true };
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: parent.userId },
                data,
            });
            if (data.phone) {
                await tx.parent.update({
                    where: { id: parent.id },
                    data: { phone: data.phone },
                });
            }
        });
        if (data.passwordHash) {
            await this.prisma.refreshToken.deleteMany({
                where: { userId: parent.userId },
            });
        }
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UPDATE_CREDENTIALS',
                entity: 'Parent',
                entityId: parentId,
                details: {
                    phoneChanged: Boolean(data.phone),
                    passwordChanged: Boolean(data.passwordHash),
                },
            },
        });
        return { ok: true, phoneChanged: Boolean(data.phone) };
    }
    async linkStudent(parentId, studentId, actorId) {
        const parent = await this.prisma.parent.findUnique({
            where: { id: parentId },
        });
        if (!parent)
            throw new common_1.NotFoundException('Parent not found');
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        await this.prisma.parentStudent.upsert({
            where: { parentId_studentId: { parentId, studentId } },
            update: {},
            create: { parentId, studentId },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'LINK',
                entity: 'Parent',
                entityId: parentId,
                details: { studentId },
            },
        });
        return this.findOne(parentId);
    }
    async unlinkStudent(parentId, studentId, actorId) {
        const parent = await this.prisma.parent.findUnique({
            where: { id: parentId },
        });
        if (!parent)
            throw new common_1.NotFoundException('Parent not found');
        await this.prisma.parentStudent.deleteMany({
            where: { parentId, studentId },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UNLINK',
                entity: 'Parent',
                entityId: parentId,
                details: { studentId },
            },
        });
        return this.findOne(parentId);
    }
    async findMyProfile(userId) {
        const parent = await this.prisma.parent.findUnique({
            where: { userId },
            select: {
                id: true,
                fullName: true,
                phone: true,
                user: { select: { phone: true } },
                students: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        student: { select: this.childSelect() },
                    },
                },
            },
        });
        if (!parent)
            throw new common_1.NotFoundException('Parent profile not found');
        return {
            id: parent.id,
            fullName: parent.fullName,
            phone: parent.phone ?? parent.user.phone,
            children: parent.students.map((s) => this.shapeChild(s.student)),
        };
    }
    async getChildAttendance(userId, query) {
        const studentId = await this.resolveChildId(userId, query.studentId);
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
        const studentId = await this.resolveChildId(userId, query.studentId);
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
            scorePercent: Number(g.maxScore) > 0
                ? Math.round((Number(g.score) / Number(g.maxScore)) * 100)
                : 0,
            groupName: g.group.name,
        }));
    }
    async getChildHomework(userId, query = {}) {
        const studentId = await this.resolveChildId(userId, query.studentId);
        const links = await this.prisma.studentGroup.findMany({
            where: { studentId },
            select: { groupId: true },
        });
        if (links.length === 0)
            return [];
        return this.prisma.homework.findMany({
            where: { groupId: { in: links.map((l) => l.groupId) } },
            orderBy: { createdAt: 'desc' },
            take: 6,
            include: { teacher: { select: { fullName: true } } },
        });
    }
    async getChildPayments(userId, query = {}) {
        const studentId = await this.resolveChildId(userId, query.studentId);
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
        });
        return this.paymentsService.findMy(student.userId);
    }
    async uploadChildReceipt(userId, file, studentId) {
        const childId = await this.resolveChildId(userId, studentId);
        return this.paymentsService.uploadReceipt(file, childId, userId);
    }
    async getChildRating(userId, query) {
        const studentId = await this.resolveChildId(userId, query.studentId);
        const link = await this.prisma.studentGroup.findFirst({
            where: { studentId },
            orderBy: { joinedAt: 'asc' },
            select: { groupId: true, student: { select: { id: true } } },
        });
        if (!link) {
            return {
                myPlace: 0,
                totalStudents: 0,
                myAverageScore: 0,
                myTotalPoints: 0,
                isVisible: false,
                rating: [],
            };
        }
        const group = await this.prisma.group.findUnique({
            where: { id: link.groupId },
            select: { isRatingVisible: true },
        });
        if (!group) {
            return {
                myPlace: 0,
                totalStudents: 0,
                myAverageScore: 0,
                myTotalPoints: 0,
                isVisible: false,
                rating: [],
            };
        }
        const ratingList = await this.gradesService.getRating(link.groupId, { period: query.period }, { id: userId, role: client_1.Role.PARENT });
        const myEntry = ratingList.find((r) => r.studentId === link.student.id);
        return {
            myPlace: myEntry ? myEntry.place : 0,
            totalStudents: ratingList.length,
            myAverageScore: myEntry ? myEntry.averageScore : 0,
            myTotalPoints: myEntry ? myEntry.totalPoints : 0,
            isVisible: group.isRatingVisible,
            rating: group.isRatingVisible ? ratingList : [],
        };
    }
};
exports.ParentsService = ParentsService;
exports.ParentsService = ParentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payments_service_1.PaymentsService,
        grades_service_1.GradesService])
], ParentsService);
//# sourceMappingURL=parents.service.js.map