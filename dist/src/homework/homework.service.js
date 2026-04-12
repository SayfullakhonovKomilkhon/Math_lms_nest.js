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
exports.HomeworkService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const hwSelect = {
    id: true,
    text: true,
    imageUrls: true,
    youtubeUrl: true,
    dueDate: true,
    createdAt: true,
    updatedAt: true,
    group: { select: { id: true, name: true } },
    teacher: { select: { id: true, fullName: true } },
};
let HomeworkService = class HomeworkService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTeacher(userId) {
        const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
        if (!teacher)
            throw new common_1.ForbiddenException('Teacher profile not found');
        return teacher;
    }
    async assertTeacherOwnsGroup(userId, groupId) {
        const teacher = await this.getTeacher(userId);
        const group = await this.prisma.group.findUnique({ where: { id: groupId } });
        if (!group)
            throw new common_1.NotFoundException('Group not found');
        if (group.teacherId !== teacher.id)
            throw new common_1.ForbiddenException('You can only manage your own groups');
        return teacher;
    }
    async create(dto, user) {
        const teacher = await this.assertTeacherOwnsGroup(user.id, dto.groupId);
        return this.prisma.homework.create({
            data: {
                groupId: dto.groupId,
                teacherId: teacher.id,
                text: dto.text,
                imageUrls: dto.imageUrls ?? [],
                youtubeUrl: dto.youtubeUrl,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            },
            select: hwSelect,
        });
    }
    async findAll(groupId, user) {
        if (user.role === client_1.Role.STUDENT) {
            const student = await this.prisma.student.findUnique({ where: { userId: user.id } });
            if (!student || student.groupId !== groupId)
                throw new common_1.ForbiddenException('You can only view your own group homework');
        }
        if (user.role === client_1.Role.PARENT) {
            const parent = await this.prisma.parent.findUnique({
                where: { userId: user.id },
                include: { student: true },
            });
            if (!parent || parent.student.groupId !== groupId)
                throw new common_1.ForbiddenException('You can only view your child\'s group homework');
        }
        return this.prisma.homework.findMany({
            where: { groupId },
            select: hwSelect,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findLatest(groupId) {
        return this.prisma.homework.findFirst({
            where: { groupId },
            select: hwSelect,
            orderBy: { createdAt: 'desc' },
        });
    }
    async update(id, dto, user) {
        const hw = await this.prisma.homework.findUnique({ where: { id } });
        if (!hw)
            throw new common_1.NotFoundException('Homework not found');
        const teacher = await this.getTeacher(user.id);
        if (hw.teacherId !== teacher.id)
            throw new common_1.ForbiddenException('You can only edit your own homework');
        return this.prisma.homework.update({
            where: { id },
            data: {
                ...dto,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            },
            select: hwSelect,
        });
    }
    async remove(id, user) {
        const hw = await this.prisma.homework.findUnique({ where: { id } });
        if (!hw)
            throw new common_1.NotFoundException('Homework not found');
        if (user.role === client_1.Role.TEACHER) {
            const teacher = await this.getTeacher(user.id);
            if (hw.teacherId !== teacher.id)
                throw new common_1.ForbiddenException('You can only delete your own homework');
        }
        await this.prisma.homework.delete({ where: { id } });
        return { deleted: true };
    }
};
exports.HomeworkService = HomeworkService;
exports.HomeworkService = HomeworkService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HomeworkService);
//# sourceMappingURL=homework.service.js.map