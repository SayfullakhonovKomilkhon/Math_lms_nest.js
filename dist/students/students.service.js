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
exports.StudentsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const studentInclude = {
    user: { select: { id: true, phone: true, role: true, isActive: true } },
    groups: {
        select: {
            id: true,
            monthlyFee: true,
            joinedAt: true,
            group: { select: { id: true, name: true, teacherId: true } },
        },
        orderBy: { joinedAt: 'asc' },
    },
};
function shapeStudent(s) {
    const groups = s.groups.map((link) => ({
        linkId: link.id,
        groupId: link.group.id,
        groupName: link.group.name,
        teacherId: link.group.teacherId,
        monthlyFee: Number(link.monthlyFee),
        joinedAt: link.joinedAt,
    }));
    const monthlyFeeTotal = groups.reduce((acc, g) => acc + g.monthlyFee, 0);
    const primary = groups[0];
    return {
        id: s.id,
        fullName: s.fullName,
        phone: s.phone,
        birthDate: s.birthDate,
        gender: s.gender,
        enrolledAt: s.enrolledAt,
        isActive: s.isActive,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        user: s.user,
        groups,
        monthlyFee: monthlyFeeTotal,
        monthlyFeeTotal,
        groupId: primary?.groupId ?? null,
        group: primary
            ? { id: primary.groupId, name: primary.groupName }
            : null,
    };
}
let StudentsService = class StudentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, actorId) {
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const phoneClash = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });
        if (phoneClash) {
            throw new common_1.ConflictException('Phone is already in use');
        }
        const student = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    phone: dto.phone,
                    passwordHash,
                    role: client_1.Role.STUDENT,
                },
            });
            const created = await tx.student.create({
                data: {
                    userId: user.id,
                    fullName: dto.fullName,
                    phone: dto.phone,
                    birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
                    gender: dto.gender,
                },
            });
            if (dto.groupId) {
                let fee = dto.monthlyFee;
                if (fee === undefined) {
                    const grp = await tx.group.findUnique({
                        where: { id: dto.groupId },
                        select: { defaultMonthlyFee: true },
                    });
                    fee = grp ? Number(grp.defaultMonthlyFee) : 0;
                }
                await tx.studentGroup.create({
                    data: {
                        studentId: created.id,
                        groupId: dto.groupId,
                        monthlyFee: fee,
                    },
                });
            }
            return tx.student.findUniqueOrThrow({
                where: { id: created.id },
                include: studentInclude,
            });
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'CREATE',
                entity: 'Student',
                entityId: student.id,
                details: { phone: dto.phone, fullName: dto.fullName },
            },
        });
        return shapeStudent(student);
    }
    async findAll() {
        const rows = await this.prisma.student.findMany({ include: studentInclude });
        return rows.map(shapeStudent);
    }
    async findOne(id, requestingUser) {
        const raw = await this.prisma.student.findUnique({
            where: { id },
            include: studentInclude,
        });
        if (!raw) {
            throw new common_1.NotFoundException('Student not found');
        }
        const student = shapeStudent(raw);
        if (requestingUser?.role === client_1.Role.TEACHER) {
            const teacher = await this.prisma.teacher.findUnique({
                where: { userId: requestingUser.id },
            });
            if (!teacher) {
                throw new common_1.ForbiddenException('You can only view students in your groups');
            }
            const teachesAny = student.groups.some((g) => g.teacherId === teacher.id);
            if (!teachesAny) {
                throw new common_1.ForbiddenException('You can only view students in your groups');
            }
        }
        return student;
    }
    async findMyProfile(userId) {
        const raw = await this.prisma.student.findUnique({
            where: { userId },
            include: {
                groups: {
                    select: {
                        id: true,
                        monthlyFee: true,
                        joinedAt: true,
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
                    orderBy: { joinedAt: 'asc' },
                },
            },
        });
        if (!raw) {
            throw new common_1.NotFoundException('Student profile not found');
        }
        const groups = raw.groups.map((link) => ({
            id: link.group.id,
            name: link.group.name,
            schedule: link.group.schedule,
            teacher: link.group.teacher,
            monthlyFee: Number(link.monthlyFee),
            joinedAt: link.joinedAt,
        }));
        const monthlyFee = groups.reduce((acc, g) => acc + g.monthlyFee, 0);
        const primary = groups[0] ?? null;
        let totalLessons = 0;
        const attendanceStats = { present: 0, absent: 0, late: 0, percentage: 0 };
        if (groups.length > 0) {
            const groupIds = groups.map((g) => g.id);
            totalLessons = await this.prisma.attendance
                .groupBy({
                by: ['groupId', 'date'],
                where: { groupId: { in: groupIds } },
            })
                .then((res) => res.length);
            const attendance = await this.prisma.attendance.findMany({
                where: { studentId: raw.id },
            });
            attendance.forEach((record) => {
                if (record.status === 'PRESENT')
                    attendanceStats.present++;
                if (record.status === 'ABSENT')
                    attendanceStats.absent++;
                if (record.status === 'LATE')
                    attendanceStats.late++;
            });
            const totalAttended = attendanceStats.present + attendanceStats.late;
            const totalRecorded = totalAttended + attendanceStats.absent;
            attendanceStats.percentage =
                totalRecorded > 0
                    ? Math.round((totalAttended / totalRecorded) * 100)
                    : 0;
        }
        return {
            id: raw.id,
            fullName: raw.fullName,
            phone: raw.phone,
            birthDate: raw.birthDate,
            gender: raw.gender,
            enrolledAt: raw.enrolledAt,
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
            totalLessons,
            attendanceStats,
        };
    }
    async updateMyProfile(userId, dto) {
        const student = await this.prisma.student.findUnique({
            where: { userId },
            include: { user: true },
        });
        if (!student || !student.user) {
            throw new common_1.NotFoundException('Student profile not found');
        }
        const wantsPhoneChange = !!dto.phone && dto.phone !== student.user.phone;
        const wantsPasswordChange = !!dto.newPassword;
        if (wantsPhoneChange || wantsPasswordChange) {
            if (!dto.currentPassword) {
                throw new common_1.BadRequestException('Current password is required to change phone or password');
            }
            const ok = await bcrypt.compare(dto.currentPassword, student.user.passwordHash);
            if (!ok) {
                throw new common_1.UnauthorizedException('Current password is incorrect');
            }
        }
        if (wantsPhoneChange) {
            const clash = await this.prisma.user.findUnique({
                where: { phone: dto.phone },
            });
            if (clash && clash.id !== student.user.id) {
                throw new common_1.ConflictException('Phone is already in use');
            }
        }
        const userData = {};
        if (wantsPhoneChange)
            userData.phone = dto.phone;
        if (wantsPasswordChange) {
            userData.passwordHash = await bcrypt.hash(dto.newPassword, 10);
        }
        const studentData = {};
        if (typeof dto.fullName === 'string' && dto.fullName.trim()) {
            studentData.fullName = dto.fullName.trim();
        }
        if (wantsPhoneChange) {
            studentData.phone = dto.phone.trim();
        }
        await this.prisma.$transaction(async (tx) => {
            if (Object.keys(userData).length > 0) {
                await tx.user.update({
                    where: { id: student.user.id },
                    data: userData,
                });
                if (userData.passwordHash) {
                    await tx.refreshToken.deleteMany({
                        where: { userId: student.user.id },
                    });
                }
            }
            if (Object.keys(studentData).length > 0) {
                await tx.student.update({
                    where: { id: student.id },
                    data: studentData,
                });
            }
        });
        await this.prisma.auditLog.create({
            data: {
                userId,
                action: 'UPDATE_OWN_PROFILE',
                entity: 'Student',
                entityId: student.id,
                details: {
                    fullNameChanged: !!studentData.fullName,
                    phoneChanged: wantsPhoneChange,
                    passwordChanged: wantsPasswordChange,
                },
            },
        });
        return this.findMyProfile(userId);
    }
    async update(id, dto, actorId) {
        const existing = await this.prisma.student.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Student not found');
        }
        const updated = await this.prisma.student.update({
            where: { id },
            data: {
                ...dto,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            },
            include: studentInclude,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UPDATE',
                entity: 'Student',
                entityId: id,
                details: dto,
            },
        });
        return shapeStudent(updated);
    }
    async addGroup(id, payload, actorId) {
        const existing = await this.prisma.student.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Student not found');
        }
        const group = await this.prisma.group.findUnique({
            where: { id: payload.groupId },
            select: { id: true, defaultMonthlyFee: true },
        });
        if (!group) {
            throw new common_1.NotFoundException('Group not found');
        }
        const fee = payload.monthlyFee !== undefined
            ? payload.monthlyFee
            : Number(group.defaultMonthlyFee);
        await this.prisma.studentGroup.upsert({
            where: {
                studentId_groupId: { studentId: id, groupId: payload.groupId },
            },
            create: {
                studentId: id,
                groupId: payload.groupId,
                monthlyFee: fee,
            },
            update: payload.monthlyFee !== undefined
                ? { monthlyFee: payload.monthlyFee }
                : {},
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'ASSIGN_GROUP',
                entity: 'Student',
                entityId: id,
                details: {
                    groupId: payload.groupId,
                    monthlyFee: payload.monthlyFee ?? null,
                },
            },
        });
        const refreshed = await this.prisma.student.findUniqueOrThrow({
            where: { id },
            include: studentInclude,
        });
        return shapeStudent(refreshed);
    }
    async updateGroupFee(id, groupId, monthlyFee, actorId) {
        const link = await this.prisma.studentGroup.findUnique({
            where: { studentId_groupId: { studentId: id, groupId } },
        });
        if (!link) {
            throw new common_1.NotFoundException('Student is not assigned to this group');
        }
        await this.prisma.studentGroup.update({
            where: { studentId_groupId: { studentId: id, groupId } },
            data: { monthlyFee },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UPDATE_GROUP_FEE',
                entity: 'Student',
                entityId: id,
                details: {
                    groupId,
                    previousFee: Number(link.monthlyFee),
                    newFee: monthlyFee,
                },
            },
        });
        const refreshed = await this.prisma.student.findUniqueOrThrow({
            where: { id },
            include: studentInclude,
        });
        return shapeStudent(refreshed);
    }
    async removeGroup(id, groupId, actorId) {
        const link = await this.prisma.studentGroup.findUnique({
            where: { studentId_groupId: { studentId: id, groupId } },
        });
        if (!link) {
            throw new common_1.NotFoundException('Student is not assigned to this group');
        }
        await this.prisma.studentGroup.delete({
            where: { studentId_groupId: { studentId: id, groupId } },
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'REMOVE_FROM_GROUP',
                entity: 'Student',
                entityId: id,
                details: { groupId },
            },
        });
        const refreshed = await this.prisma.student.findUniqueOrThrow({
            where: { id },
            include: studentInclude,
        });
        return shapeStudent(refreshed);
    }
    async removeFromAllGroups(id, actorId) {
        const existing = await this.prisma.student.findUnique({
            where: { id },
            include: { groups: { select: { groupId: true } } },
        });
        if (!existing)
            throw new common_1.NotFoundException('Student not found');
        if (existing.groups.length > 0) {
            await this.prisma.studentGroup.deleteMany({
                where: { studentId: id },
            });
        }
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'REMOVE_FROM_GROUP',
                entity: 'Student',
                entityId: id,
                details: {
                    previousGroupIds: existing.groups.map((g) => g.groupId),
                },
            },
        });
        const refreshed = await this.prisma.student.findUniqueOrThrow({
            where: { id },
            include: studentInclude,
        });
        return shapeStudent(refreshed);
    }
    async deactivate(id, actorId) {
        const existing = await this.prisma.student.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Student not found');
        }
        const updated = await this.prisma.student.update({
            where: { id },
            data: { isActive: false },
            include: studentInclude,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'DEACTIVATE',
                entity: 'Student',
                entityId: id,
            },
        });
        return shapeStudent(updated);
    }
    async updateCredentials(studentId, payload, actorId) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, userId: true, user: { select: { phone: true } } },
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const data = {};
        if (payload.phone && payload.phone !== student.user.phone) {
            const existing = await this.prisma.user.findUnique({
                where: { phone: payload.phone },
            });
            if (existing && existing.id !== student.userId) {
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
                where: { id: student.userId },
                data,
            });
            if (data.phone) {
                await tx.student.update({
                    where: { id: student.id },
                    data: { phone: data.phone },
                });
            }
        });
        if (data.passwordHash) {
            await this.prisma.refreshToken.deleteMany({
                where: { userId: student.userId },
            });
        }
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'UPDATE_CREDENTIALS',
                entity: 'Student',
                entityId: studentId,
                details: {
                    phoneChanged: Boolean(data.phone),
                    passwordChanged: Boolean(data.passwordHash),
                },
            },
        });
        return { ok: true, phoneChanged: Boolean(data.phone) };
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentsService);
//# sourceMappingURL=students.service.js.map