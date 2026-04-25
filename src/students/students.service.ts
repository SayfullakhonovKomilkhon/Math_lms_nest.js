import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

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

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto, actorId: string) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: Role.STUDENT,
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

  async findOne(
    id: string,
    requestingUser?: { id: string; role: Role; studentId?: string },
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: {
        ...studentSelect,
        group: { select: { id: true, name: true, teacherId: true } },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (requestingUser?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: requestingUser.id },
      });
      if (!teacher || student.group?.id !== student.groupId) {
        // Teacher can only view students in their groups
        const teacherGroups = await this.prisma.group.findMany({
          where: { teacherId: teacher?.id },
          select: { id: true },
        });
        const groupIds = teacherGroups.map((g) => g.id);
        if (!student.groupId || !groupIds.includes(student.groupId)) {
          throw new ForbiddenException(
            'You can only view students in your groups',
          );
        }
      }
    }

    return student;
  }

  async findMyProfile(userId: string) {
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
      throw new NotFoundException('Student profile not found');
    }

    let totalLessons = 0;
    const attendanceStats = { present: 0, absent: 0, late: 0, percentage: 0 };

    if (student.group) {
      // Calculate total lessons held in the group
      totalLessons = await this.prisma.attendance
        .groupBy({
          by: ['date'],
          where: { groupId: student.group.id },
        })
        .then((res) => res.length);

      // Get attendance stats for this student
      const attendance = await this.prisma.attendance.findMany({
        where: { studentId: student.id },
      });

      attendance.forEach((record) => {
        if (record.status === 'PRESENT') attendanceStats.present++;
        if (record.status === 'ABSENT') attendanceStats.absent++;
        if (record.status === 'LATE') attendanceStats.late++;
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

  /**
   * Allow a logged-in STUDENT to update their own account data:
   * full name, phone, email (login) and password.
   * Changing email or password requires the current password.
   */
  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!student || !student.user) {
      throw new NotFoundException('Student profile not found');
    }

    const wantsEmailChange = !!dto.email && dto.email !== student.user.email;
    const wantsPasswordChange = !!dto.newPassword;

    if (wantsEmailChange || wantsPasswordChange) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to change email or password',
        );
      }
      const ok = await bcrypt.compare(
        dto.currentPassword,
        student.user.passwordHash,
      );
      if (!ok) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    if (wantsEmailChange) {
      const clash = await this.prisma.user.findUnique({
        where: { email: dto.email! },
      });
      if (clash && clash.id !== student.user.id) {
        throw new ConflictException('Email is already in use');
      }
    }

    const userData: { email?: string; passwordHash?: string } = {};
    if (wantsEmailChange) userData.email = dto.email!;
    if (wantsPasswordChange) {
      userData.passwordHash = await bcrypt.hash(dto.newPassword!, 10);
    }

    const studentData: { fullName?: string; phone?: string | null } = {};
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
          // Force re-login on other devices after password change
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

  async update(id: string, dto: UpdateStudentDto, actorId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Student not found');
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
        details: dto as object,
      },
    });

    return updated;
  }

  async removeFromGroup(id: string, actorId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Student not found');

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

  async assignGroup(id: string, groupId: string, actorId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Student not found');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
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

  async deactivate(id: string, actorId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Student not found');
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

  // Admin-only credentials reset: change a student's email and/or password
  // without requiring the old password. Used from the admin profile screen.
  async updateCredentials(
    studentId: string,
    payload: { email?: string; password?: string },
    actorId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, userId: true, user: { select: { email: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const data: { email?: string; passwordHash?: string } = {};

    if (payload.email && payload.email !== student.user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });
      if (existing && existing.id !== student.userId) {
        throw new ConflictException('Email already in use');
      }
      data.email = payload.email;
    }

    if (payload.password) {
      if (payload.password.length < 8) {
        throw new BadRequestException(
          'Password must be at least 8 characters long',
        );
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

    // Invalidate any active refresh tokens so the student is forced to
    // log in again with their new credentials.
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
}
