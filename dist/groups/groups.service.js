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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const groupSelect = {
    id: true,
    name: true,
    maxStudents: true,
    schedule: true,
    defaultMonthlyFee: true,
    isActive: true,
    isRatingVisible: true,
    archivedAt: true,
    createdAt: true,
    updatedAt: true,
    teacher: { select: { id: true, fullName: true } },
    _count: { select: { students: true } },
};
function shapeGroup(g) {
    return {
        ...g,
        defaultMonthlyFee: Number(g.defaultMonthlyFee),
    };
}
let GroupsService = class GroupsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, actorId) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { id: dto.teacherId },
        });
        if (!teacher) {
            throw new common_1.NotFoundException('Teacher not found');
        }
        const group = await this.prisma.group.create({
            data: {
                name: dto.name,
                teacherId: dto.teacherId,
                maxStudents: dto.maxStudents ?? 20,
                schedule: dto.schedule,
                defaultMonthlyFee: dto.defaultMonthlyFee ?? 0,
            },
            select: groupSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'CREATE',
                entity: 'Group',
                entityId: group.id,
                details: { name: dto.name },
            },
        });
        return shapeGroup(group);
    }
    async findAll(user) {
        if (user.role === client_1.Role.TEACHER) {
            const teacher = await this.prisma.teacher.findUnique({
                where: { userId: user.id },
            });
            if (!teacher)
                return [];
            const rows = await this.prisma.group.findMany({
                where: { teacherId: teacher.id },
                select: groupSelect,
            });
            return rows.map(shapeGroup);
        }
        const rows = await this.prisma.group.findMany({ select: groupSelect });
        return rows.map(shapeGroup);
    }
    async findOne(id, user) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            select: groupSelect,
        });
        if (!group) {
            throw new common_1.NotFoundException('Group not found');
        }
        if (user.role === client_1.Role.TEACHER) {
            const teacher = await this.prisma.teacher.findUnique({
                where: { userId: user.id },
            });
            if (!teacher || group.teacher.id !== teacher.id) {
                throw new common_1.ForbiddenException('You can only access your own groups');
            }
        }
        return shapeGroup(group);
    }
    async findStudents(groupId, user) {
        await this.findOne(groupId, user);
        const links = await this.prisma.studentGroup.findMany({
            where: { groupId },
            select: {
                monthlyFee: true,
                joinedAt: true,
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        gender: true,
                        isActive: true,
                        user: { select: { phone: true } },
                    },
                },
            },
            orderBy: { joinedAt: 'asc' },
        });
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const studentIds = links.map((l) => l.student.id);
        const paidThisMonth = studentIds.length > 0
            ? await this.prisma.payment.findMany({
                where: {
                    studentId: { in: studentIds },
                    status: client_1.PaymentStatus.CONFIRMED,
                    confirmedAt: { gte: startOfMonth },
                },
                select: { studentId: true },
            })
            : [];
        const paidSet = new Set(paidThisMonth.map((p) => p.studentId));
        return links.map((link) => ({
            ...link.student,
            monthlyFee: Number(link.monthlyFee),
            joinedAt: link.joinedAt,
            hasPaidThisMonth: paidSet.has(link.student.id),
        }));
    }
    async update(id, dto, actorId) {
        const existing = await this.prisma.group.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Group not found');
        }
        const { teacherId, schedule, ...rest } = dto;
        const updated = await this.prisma.group.update({
            where: { id },
            data: {
                ...rest,
                ...(teacherId && { teacher: { connect: { id: teacherId } } }),
                ...(schedule && { schedule: schedule }),
            },
            select: groupSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UPDATE',
                entity: 'Group',
                entityId: id,
                details: dto,
            },
        });
        return shapeGroup(updated);
    }
    async archive(id, actorId) {
        const existing = await this.prisma.group.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Group not found');
        }
        const archived = await this.prisma.group.update({
            where: { id },
            data: { isActive: false, archivedAt: new Date() },
            select: groupSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'ARCHIVE',
                entity: 'Group',
                entityId: id,
            },
        });
        return shapeGroup(archived);
    }
    async updateRatingVisibility(id, isRatingVisible, user) {
        const group = await this.findOne(id, user);
        const visibilityUpdated = await this.prisma.group.update({
            where: { id: group.id },
            data: { isRatingVisible },
            select: groupSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'UPDATE_RATING_VISIBILITY',
                entity: 'Group',
                entityId: id,
                details: { isRatingVisible },
            },
        });
        return shapeGroup(visibilityUpdated);
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupsService);
//# sourceMappingURL=groups.service.js.map