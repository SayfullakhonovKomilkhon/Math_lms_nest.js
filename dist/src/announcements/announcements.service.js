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
exports.AnnouncementsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let AnnouncementsService = class AnnouncementsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, user) {
        if (user.role === client_1.Role.TEACHER) {
            if (!dto.groupId) {
                throw new common_1.ForbiddenException('Teachers must specify a groupId');
            }
            const teacher = await this.prisma.teacher.findUnique({ where: { userId: user.id } });
            if (!teacher)
                throw new common_1.ForbiddenException('Teacher profile not found');
            const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
            if (!group || group.teacherId !== teacher.id) {
                throw new common_1.ForbiddenException('You can only create announcements for your own groups');
            }
        }
        return this.prisma.announcement.create({
            data: {
                title: dto.title,
                message: dto.message,
                authorId: user.id,
                groupId: dto.groupId || null,
            },
            include: {
                author: { select: { email: true } },
                group: { select: { id: true, name: true } },
            },
        });
    }
    async findMy(user) {
        let groupId = null;
        if (user.role === client_1.Role.STUDENT) {
            const student = await this.prisma.student.findUnique({ where: { userId: user.id } });
            groupId = student?.groupId ?? null;
        }
        else if (user.role === client_1.Role.PARENT) {
            const parent = await this.prisma.parent.findUnique({
                where: { userId: user.id },
                include: { student: true },
            });
            groupId = parent?.student?.groupId ?? null;
        }
        else if (user.role === client_1.Role.TEACHER) {
            const teacher = await this.prisma.teacher.findUnique({ where: { userId: user.id } });
            if (!teacher)
                return [];
            const myGroups = await this.prisma.group.findMany({
                where: { teacherId: teacher.id },
                select: { id: true },
            });
            const groupIds = myGroups.map((g) => g.id);
            return this.prisma.announcement.findMany({
                where: {
                    OR: [{ groupId: null }, { groupId: { in: groupIds } }],
                },
                include: {
                    author: { select: { email: true } },
                    group: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
            });
        }
        return this.prisma.announcement.findMany({
            where: {
                OR: [{ groupId: null }, ...(groupId ? [{ groupId }] : [])],
            },
            include: {
                author: { select: { email: true } },
                group: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
    }
    async findAll() {
        return this.prisma.announcement.findMany({
            include: {
                author: { select: { email: true } },
                group: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.AnnouncementsService = AnnouncementsService;
exports.AnnouncementsService = AnnouncementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnnouncementsService);
//# sourceMappingURL=announcements.service.js.map