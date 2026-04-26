import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

// What we always include when loading a student. `groups` is the
// many-to-many link table (one row per group the student belongs to,
// each carrying its own monthlyFee).
const studentInclude = {
  user: { select: { id: true, phone: true, role: true, isActive: true } },
  groups: {
    select: {
      id: true,
      monthlyFee: true,
      joinedAt: true,
      group: { select: { id: true, name: true, teacherId: true } },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
} satisfies Prisma.StudentInclude;

type RawStudent = Prisma.StudentGetPayload<{ include: typeof studentInclude }>;

export type StudentGroupLink = {
  linkId: string;
  groupId: string;
  groupName: string;
  teacherId: string;
  monthlyFee: number;
  joinedAt: Date;
};

export type StudentDto = {
  id: string;
  fullName: string;
  phone: string | null;
  birthDate: Date | null;
  gender: RawStudent['gender'];
  enrolledAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: RawStudent['user'];
  groups: StudentGroupLink[];
  // Aggregate of per-group fees. Exposed as `monthlyFee` for backwards
  // compatibility with consumers that used the old single-fee model.
  monthlyFee: number;
  monthlyFeeTotal: number;
  // First/primary group, kept around so legacy UI that only knows about
  // a single group still has something to render.
  groupId: string | null;
  group: { id: string; name: string } | null;
};

function shapeStudent(s: RawStudent): StudentDto {
  const groups: StudentGroupLink[] = s.groups.map((link) => ({
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

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStudentDto, actorId: string) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const phoneClash = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (phoneClash) {
      throw new ConflictException('Phone is already in use');
    }

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: dto.phone,
          passwordHash,
          role: Role.STUDENT,
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

      // Optional initial group with its own per-link fee. When the admin
      // doesn't override the price we copy the group's configured default
      // (Group.defaultMonthlyFee) so the enrollment isn't silently free.
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

  async findOne(
    id: string,
    requestingUser?: { id: string; role: Role; studentId?: string },
  ) {
    const raw = await this.prisma.student.findUnique({
      where: { id },
      include: studentInclude,
    });

    if (!raw) {
      throw new NotFoundException('Student not found');
    }

    const student = shapeStudent(raw);

    if (requestingUser?.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: requestingUser.id },
      });
      if (!teacher) {
        throw new ForbiddenException(
          'You can only view students in your groups',
        );
      }
      const teachesAny = student.groups.some(
        (g) => g.teacherId === teacher.id,
      );
      if (!teachesAny) {
        throw new ForbiddenException(
          'You can only view students in your groups',
        );
      }
    }

    return student;
  }

  async findMyProfile(userId: string) {
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
      throw new NotFoundException('Student profile not found');
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
      // Total lessons: distinct (groupId, date) pairs across all the
      // student's groups.
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
      id: raw.id,
      fullName: raw.fullName,
      phone: raw.phone,
      birthDate: raw.birthDate,
      gender: raw.gender,
      enrolledAt: raw.enrolledAt,
      monthlyFee,
      // Legacy single-group field — primary (= first joined) group, so the
      // existing student/parent panels keep rendering something sensible.
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

  /**
   * Allow a logged-in STUDENT to update their own account data:
   * full name, phone (login identifier) and password.
   * Changing phone or password requires the current password.
   */
  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!student || !student.user) {
      throw new NotFoundException('Student profile not found');
    }

    const wantsPhoneChange = !!dto.phone && dto.phone !== student.user.phone;
    const wantsPasswordChange = !!dto.newPassword;

    if (wantsPhoneChange || wantsPasswordChange) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to change phone or password',
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

    if (wantsPhoneChange) {
      const clash = await this.prisma.user.findUnique({
        where: { phone: dto.phone! },
      });
      if (clash && clash.id !== student.user.id) {
        throw new ConflictException('Phone is already in use');
      }
    }

    const userData: { phone?: string; passwordHash?: string } = {};
    if (wantsPhoneChange) userData.phone = dto.phone!;
    if (wantsPasswordChange) {
      userData.passwordHash = await bcrypt.hash(dto.newPassword!, 10);
    }

    const studentData: { fullName?: string; phone?: string | null } = {};
    if (typeof dto.fullName === 'string' && dto.fullName.trim()) {
      studentData.fullName = dto.fullName.trim();
    }
    // Mirror the login phone onto the student's contact phone so the two
    // never drift apart from the user's perspective.
    if (wantsPhoneChange) {
      studentData.phone = dto.phone!.trim();
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
      include: studentInclude,
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

    return shapeStudent(updated);
  }

  /**
   * Add the student to a group with a per-link monthlyFee.
   * Idempotent: if the link already exists, only the fee is updated
   * (when supplied). The single previous endpoint (`PATCH :id/group`)
   * used to *replace* the group; with multi-group enrollments that no
   * longer makes sense, so we add instead. Frontend callers that want
   * "move student to another group" should call removeGroup + addGroup.
   */
  async addGroup(
    id: string,
    payload: { groupId: string; monthlyFee?: number },
    actorId: string,
  ) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Student not found');
    }

    const group = await this.prisma.group.findUnique({
      where: { id: payload.groupId },
      select: { id: true, defaultMonthlyFee: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // If the admin didn't pass an explicit fee, fall back to the group's
    // configured default so each new enrollment carries the right price out
    // of the box.
    const fee =
      payload.monthlyFee !== undefined
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
      update:
        payload.monthlyFee !== undefined
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

  async updateGroupFee(
    id: string,
    groupId: string,
    monthlyFee: number,
    actorId: string,
  ) {
    const link = await this.prisma.studentGroup.findUnique({
      where: { studentId_groupId: { studentId: id, groupId } },
    });
    if (!link) {
      throw new NotFoundException('Student is not assigned to this group');
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

  async removeGroup(id: string, groupId: string, actorId: string) {
    const link = await this.prisma.studentGroup.findUnique({
      where: { studentId_groupId: { studentId: id, groupId } },
    });
    if (!link) {
      throw new NotFoundException('Student is not assigned to this group');
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

  /**
   * Detach the student from *all* their groups. Kept around for the
   * legacy `PATCH :id/remove-group` endpoint — newer callers should
   * use removeGroup(:id, :groupId).
   */
  async removeFromAllGroups(id: string, actorId: string) {
    const existing = await this.prisma.student.findUnique({
      where: { id },
      include: { groups: { select: { groupId: true } } },
    });
    if (!existing) throw new NotFoundException('Student not found');

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

  async deactivate(id: string, actorId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Student not found');
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

  async updateCredentials(
    studentId: string,
    payload: { phone?: string; password?: string },
    actorId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, userId: true, user: { select: { phone: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const data: { phone?: string; passwordHash?: string } = {};

    if (payload.phone && payload.phone !== student.user.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: payload.phone },
      });
      if (existing && existing.id !== student.userId) {
        throw new ConflictException('Phone already in use');
      }
      data.phone = payload.phone;
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

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: student.userId },
        data,
      });
      // Keep Student.phone (contact info) in sync with the login phone.
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
}
