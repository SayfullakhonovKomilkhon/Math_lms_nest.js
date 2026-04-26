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
exports.ScheduleService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let ScheduleService = class ScheduleService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMySchedule(userId) {
        const student = await this.prisma.student.findUnique({
            where: { userId },
            include: {
                groups: {
                    orderBy: { joinedAt: 'asc' },
                    include: {
                        group: {
                            include: {
                                teacher: { select: { fullName: true, phone: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!student)
            throw new common_1.ForbiddenException('Student profile not found');
        const primary = student.groups[0]?.group;
        if (!primary)
            return { schedule: null, nextTopic: null };
        const nextTopic = await this.prisma.lessonTopic.findFirst({
            where: {
                groupId: primary.id,
                date: { gte: new Date() },
            },
            orderBy: { date: 'asc' },
        });
        return {
            groupId: primary.id,
            groupName: primary.name,
            schedule: primary.schedule,
            teacher: {
                fullName: primary.teacher.fullName,
                phone: primary.teacher.phone,
            },
            nextTopic: nextTopic
                ? {
                    date: nextTopic.date,
                    topic: nextTopic.topic,
                    materials: nextTopic.materials,
                }
                : null,
        };
    }
    async getGroupSchedule(groupId, user) {
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
            include: {
                teacher: {
                    select: { id: true, fullName: true, phone: true, userId: true },
                },
            },
        });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (user.role === client_1.Role.TEACHER) {
            if (group.teacher.userId !== user.id)
                throw new common_1.ForbiddenException('You can only view your own groups');
        }
        const nextTopic = await this.prisma.lessonTopic.findFirst({
            where: { groupId, date: { gte: new Date() } },
            orderBy: { date: 'asc' },
        });
        return {
            groupId: group.id,
            groupName: group.name,
            schedule: group.schedule,
            teacher: { fullName: group.teacher.fullName, phone: group.teacher.phone },
            nextTopic: nextTopic
                ? { date: nextTopic.date, topic: nextTopic.topic }
                : null,
        };
    }
};
exports.ScheduleService = ScheduleService;
exports.ScheduleService = ScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ScheduleService);
//# sourceMappingURL=schedule.service.js.map