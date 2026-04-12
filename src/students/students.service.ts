import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

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

  async findOne(id: string, requestingUser?: { id: string; role: Role; studentId?: string }) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { ...studentSelect, group: { select: { id: true, name: true, teacherId: true } } },
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
          throw new ForbiddenException('You can only view students in your groups');
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
      totalLessons = await this.prisma.attendance.groupBy({
        by: ['date'],
        where: { groupId: student.group.id },
      }).then(res => res.length);

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
      
      attendanceStats.percentage = totalRecorded > 0 
        ? Math.round((totalAttended / totalRecorded) * 100) 
        : 0;
    }

    return {
      ...student,
      totalLessons,
      attendanceStats,
    };
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

  async assignGroup(id: string, groupId: string, actorId: string) {
    const existing = await this.prisma.student.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Student not found');
    }

    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
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
}
