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
exports.LessonTopicsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let LessonTopicsService = class LessonTopicsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertTeacherOwnsGroup(userId, groupId) {
        const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
        if (!teacher)
            throw new common_1.ForbiddenException('Teacher profile not found');
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
        });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.teacherId !== teacher.id)
            throw new common_1.ForbiddenException('You can only manage your own groups');
        return teacher;
    }
    async create(dto, user) {
        const teacher = await this.assertTeacherOwnsGroup(user.id, dto.groupId);
        return this.prisma.lessonTopic.create({
            data: {
                groupId: dto.groupId,
                teacherId: teacher.id,
                date: new Date(dto.date),
                topic: dto.topic,
                materials: dto.materials ?? client_1.Prisma.JsonNull,
            },
            include: {
                group: { select: { id: true, name: true } },
                teacher: { select: { id: true, fullName: true } },
            },
        });
    }
    async findAll(query, user) {
        if (user.role === client_1.Role.STUDENT && query.groupId) {
            const student = await this.prisma.student.findUnique({
                where: { userId: user.id },
            });
            if (!student || student.groupId !== query.groupId)
                throw new common_1.ForbiddenException('You can only view your own group topics');
        }
        const where = {};
        if (query.groupId)
            where.groupId = query.groupId;
        if (query.from || query.to) {
            where.date = {};
            if (query.from)
                where.date.gte = new Date(query.from);
            if (query.to)
                where.date.lte = new Date(query.to);
        }
        return this.prisma.lessonTopic.findMany({
            where,
            include: {
                group: { select: { id: true, name: true } },
                teacher: { select: { id: true, fullName: true } },
            },
            orderBy: { date: 'desc' },
        });
    }
    async findNext(groupId) {
        return this.prisma.lessonTopic.findFirst({
            where: {
                groupId,
                date: { gte: new Date() },
            },
            include: {
                group: { select: { id: true, name: true } },
                teacher: { select: { id: true, fullName: true } },
            },
            orderBy: { date: 'asc' },
        });
    }
    async findSuggestions(query) {
        const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 300);
        const where = {};
        if (query.q && query.q.trim()) {
            where.topic = { contains: query.q.trim(), mode: 'insensitive' };
        }
        const rows = await this.prisma.lessonTopic.findMany({
            where,
            select: { topic: true, date: true },
            orderBy: { date: 'desc' },
            take: limit * 4,
        });
        const seen = new Map();
        for (const r of rows) {
            const key = r.topic.trim().toLowerCase();
            if (!key)
                continue;
            if (!seen.has(key))
                seen.set(key, { topic: r.topic, lastUsedAt: r.date });
            if (seen.size >= limit)
                break;
        }
        return Array.from(seen.values());
    }
};
exports.LessonTopicsService = LessonTopicsService;
exports.LessonTopicsService = LessonTopicsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LessonTopicsService);
//# sourceMappingURL=lesson-topics.service.js.map