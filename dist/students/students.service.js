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
const studentSelect = {
    id: true,
    fullName: true,
    phone: true,
    birthDate: true,
    gender: true,
    enrolledAt: true,
    groupId: true,
    monthlyFee: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    user: { select: { id: true, email: true, role: true, isActive: true } },
    group: { select: { id: true, name: true } },
};
let StudentsService = class StudentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, actorId) {
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const student = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    passwordHash,
                    role: client_1.Role.STUDENT,
                },
            });
            return tx.student.create({
                data: {
                    userId: user.id,
                    fullName: dto.fullName,
                    phone: dto.phone,
                    birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
                    gender: dto.gender,
                    groupId: dto.groupId,
                    monthlyFee: dto.monthlyFee ?? 0,
                },
                select: studentSelect,
            });
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'CREATE',
                entity: 'Student',
                entityId: student.id,
                details: { email: dto.email, fullName: dto.fullName },
            },
        });
        return student;
    }
    async findAll() {
        return this.prisma.student.findMany({ select: studentSelect });
    }
    async findOne(id, requestingUser) {
        const student = await this.prisma.student.findUnique({
            where: { id },
            select: {
                ...studentSelect,
                group: { select: { id: true, name: true, teacherId: true } },
            },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        if (requestingUser?.role === client_1.Role.TEACHER) {
            const teacher = await this.prisma.teacher.findUnique({
                where: { userId: requestingUser.id },
            });
            if (!teacher || student.group?.id !== student.groupId) {
                const teacherGroups = await this.prisma.group.findMany({
                    where: { teacherId: teacher?.id },
                    select: { id: true },
                });
                const groupIds = teacherGroups.map((g) => g.id);
                if (!student.groupId || !groupIds.includes(student.groupId)) {
                    throw new common_1.ForbiddenException('You can only view students in your groups');
                }
            }
        }
        return student;
    }
    async findMyProfile(userId) {
        const student = await this.prisma.student.findUnique({
            where: { userId },
            select: {
                id: true,
                fullName: true,
                phone: true,
                birthDate: true,
                gender: true,
                enrolledAt: true,
                monthlyFee: true,
                group: {
                    select: {
                        id: true,
                        name: true,
                        schedule: true,
                        teacher: {
                            select: {
                                fullName: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student profile not found');
        }
        let totalLessons = 0;
        const attendanceStats = { present: 0, absent: 0, late: 0, percentage: 0 };
        if (student.group) {
            totalLessons = await this.prisma.attendance
                .groupBy({
                by: ['date'],
                where: { groupId: student.group.id },
            })
                .then((res) => res.length);
            const attendance = await this.prisma.attendance.findMany({
                where: { studentId: student.id },
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
            ...student,
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
        const wantsEmailChange = !!dto.email && dto.email !== student.user.email;
        const wantsPasswordChange = !!dto.newPassword;
        if (wantsEmailChange || wantsPasswordChange) {
            if (!dto.currentPassword) {
                throw new common_1.BadRequestException('Current password is required to change email or password');
            }
            const ok = await bcrypt.compare(dto.currentPassword, student.user.passwordHash);
            if (!ok) {
                throw new common_1.UnauthorizedException('Current password is incorrect');
            }
        }
        if (wantsEmailChange) {
            const clash = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (clash && clash.id !== student.user.id) {
                throw new common_1.ConflictException('Email is already in use');
            }
        }
        const userData = {};
        if (wantsEmailChange)
            userData.email = dto.email;
        if (wantsPasswordChange) {
            userData.passwordHash = await bcrypt.hash(dto.newPassword, 10);
        }
        const studentData = {};
        if (typeof dto.fullName === 'string' && dto.fullName.trim()) {
            studentData.fullName = dto.fullName.trim();
        }
        if (typeof dto.phone === 'string') {
            studentData.phone = dto.phone.trim() || null;
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
                    phoneChanged: 'phone' in studentData,
                    emailChanged: wantsEmailChange,
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
            select: studentSelect,
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
        return updated;
    }
    async removeFromGroup(id, actorId) {
        const existing = await this.prisma.student.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Student not found');
        const updated = await this.prisma.student.update({
            where: { id },
            data: { groupId: null },
            select: studentSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'REMOVE_FROM_GROUP',
                entity: 'Student',
                entityId: id,
                details: { previousGroupId: existing.groupId },
            },
        });
        return updated;
    }
    async assignGroup(id, groupId, actorId) {
        const existing = await this.prisma.student.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Student not found');
        }
        const group = await this.prisma.group.findUnique({
            where: { id: groupId },
        });
        if (!group) {
            throw new common_1.NotFoundException('Group not found');
        }
        const updated = await this.prisma.student.update({
            where: { id },
            data: { groupId },
            select: studentSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'ASSIGN_GROUP',
                entity: 'Student',
                entityId: id,
                details: { groupId },
            },
        });
        return updated;
    }
    async deactivate(id, actorId) {
        const existing = await this.prisma.student.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('Student not found');
        }
        const updated = await this.prisma.student.update({
            where: { id },
            data: { isActive: false },
            select: studentSelect,
        });
        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'DEACTIVATE',
                entity: 'Student',
                entityId: id,
            },
        });
        return updated;
    }
    async updateCredentials(studentId, payload, actorId) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, userId: true, user: { select: { email: true } } },
        });
        if (!student)
            throw new common_1.NotFoundException('Student not found');
        const data = {};
        if (payload.email && payload.email !== student.user.email) {
            const existing = await this.prisma.user.findUnique({
                where: { email: payload.email },
            });
            if (existing && existing.id !== student.userId) {
                throw new common_1.ConflictException('Email already in use');
            }
            data.email = payload.email;
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
        await this.prisma.user.update({
            where: { id: student.userId },
            data,
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
                    emailChanged: Boolean(data.email),
                    passwordChanged: Boolean(data.passwordHash),
                },
            },
        });
        return { ok: true, emailChanged: Boolean(data.email) };
    }
};
exports.StudentsService = StudentsService;
exports.StudentsService = StudentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentsService);
//# sourceMappingURL=students.service.js.map