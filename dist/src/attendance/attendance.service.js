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
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let AttendanceService = class AttendanceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertTeacherOwnsGroup(userId, groupId) {
        const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
        if (!teacher)
            throw new common_1.ForbiddenException('Teacher profile not found');
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.teacherId !== teacher.id)
            throw new common_1.ForbiddenException('You can only manage your own groups');
        return teacher;
    }
    async bulkCreate(dto, user) {
        if (user.role === client_1.Role.TEACHER) {
            await this.assertTeacherOwnsGroup(user.id, dto.groupId);
        }
        const date = new Date(dto.date);
        const results = await this.prisma.$transaction(dto.records.map((r) => this.prisma.attendance.upsert({
            where: {
                studentId_groupId_date: {
                    studentId: r.studentId,
                    groupId: dto.groupId,
                    date,
                },
            },
            create: {
                studentId: r.studentId,
                groupId: dto.groupId,
                date,
                lessonType: dto.lessonType,
                status: r.status,
            },
            update: {
                status: r.status,
                lessonType: dto.lessonType,
            },
        })));
        return { saved: results.length };
    }
    async findAll(query, user) {
        const where = {};
        if (user.role === client_1.Role.TEACHER) {
            const teacher = await this.prisma.teacher.findUnique({ where: { userId: user.id } });
            if (!teacher)
                throw new common_1.ForbiddenException('Teacher profile not found');
            const myGroups = await this.prisma.group.findMany({
                where: { teacherId: teacher.id },
                select: { id: true },
            });
            const myGroupIds = myGroups.map((g) => g.id);
            if (myGroupIds.length === 0)
                return [];
            if (query.groupId) {
                if (!myGroupIds.includes(query.groupId))
                    throw new common_1.ForbiddenException('Access denied to this group');
                where.groupId = query.groupId;
            }
            else {
                where.groupId = { in: myGroupIds };
            }
        }
        else if (query.groupId) {
            where.groupId = query.groupId;
        }
        if (query.studentId)
            where.studentId = query.studentId;
        if (query.date)
            where.date = new Date(query.date);
        if (query.from || query.to) {
            where.date = {};
            if (query.from)
                where.date.gte = new Date(query.from);
            if (query.to)
                where.date.lte = new Date(query.to);
        }
        return this.prisma.attendance.findMany({
            where,
            include: {
                student: { select: { id: true, fullName: true } },
                group: { select: { id: true, name: true } },
            },
            orderBy: { date: 'desc' },
        });
    }
    async update(id, dto, user) {
        const record = await this.prisma.attendance.findUnique({ where: { id } });
        if (!record)
            throw new common_1.NotFoundException('Attendance record not found');
        if (user.role === client_1.Role.TEACHER) {
            await this.assertTeacherOwnsGroup(user.id, record.groupId);
        }
        return this.prisma.attendance.update({
            where: { id },
            data: {
                status: dto.status,
                editReason: dto.editReason,
                editedAt: new Date(),
            },
        });
    }
    async getSummary(query, user) {
        if (!query.groupId)
            throw new common_1.ForbiddenException('groupId is required');
        if (user.role === client_1.Role.TEACHER) {
            await this.assertTeacherOwnsGroup(user.id, query.groupId);
        }
        const where = { groupId: query.groupId };
        if (query.from || query.to) {
            where.date = {};
            if (query.from)
                where.date.gte = new Date(query.from);
            if (query.to)
                where.date.lte = new Date(query.to);
        }
        const records = await this.prisma.attendance.findMany({
            where,
            include: { student: { select: { id: true, fullName: true } } },
        });
        const map = new Map();
        for (const r of records) {
            const key = r.studentId;
            if (!map.has(key)) {
                map.set(key, {
                    studentId: r.studentId,
                    fullName: r.student.fullName,
                    present: 0,
                    absent: 0,
                    late: 0,
                });
            }
            const entry = map.get(key);
            if (r.status === client_1.AttendanceStatus.PRESENT)
                entry.present++;
            else if (r.status === client_1.AttendanceStatus.ABSENT)
                entry.absent++;
            else if (r.status === client_1.AttendanceStatus.LATE)
                entry.late++;
        }
        return Array.from(map.values()).map((s) => {
            const total = s.present + s.absent + s.late;
            return {
                ...s,
                totalLessons: total,
                percentage: total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0,
            };
        });
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map