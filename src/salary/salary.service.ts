import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalaryService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  async getMySalary(userId: string) {
    // `Group.students` is now the StudentGroup join table; counting active
    // students in a group means filtering the link rows by the *student*
    // being active.
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: {
        groups: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                students: { where: { student: { isActive: true } } },
              },
            },
          },
        },
      },
    });

    if (!teacher) throw new ForbiddenException('Teacher profile not found');

    const studentCount = teacher.groups.reduce(
      (sum, g) => sum + g._count.students,
      0,
    );
    const rate = Number(teacher.ratePerStudent);
    const totalSalary = studentCount * rate;

    return {
      teacherId: teacher.id,
      fullName: teacher.fullName,
      studentCount,
      ratePerStudent: rate,
      totalSalary,
      groups: teacher.groups.map((g) => ({
        id: g.id,
        name: g.name,
        studentCount: g._count.students,
        groupSalary: g._count.students * rate,
      })),
    };
  }

  async getAllSalaries() {
    const teachers = await this.prisma.teacher.findMany({
      where: { isActive: true },
      include: {
        groups: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                students: { where: { student: { isActive: true } } },
              },
            },
          },
        },
      },
    });

    return teachers.map((t) => {
      const studentCount = t.groups.reduce(
        (sum, g) => sum + g._count.students,
        0,
      );
      const rate = Number(t.ratePerStudent);
      return {
        teacherId: t.id,
        fullName: t.fullName,
        studentCount,
        ratePerStudent: rate,
        totalSalary: studentCount * rate,
      };
    });
  }

  // ── History ──────────────────────────────────────────────────────────────

  async getHistory(teacherId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Build 6-month rolling history from attendance/payments data
    const months: {
      month: string;
      studentsCount: number;
      ratePerStudent: number;
      totalSalary: number;
    }[] = [];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
      const monthLabel = d.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
      });

      if (i === 0) {
        const groups = await this.prisma.group.findMany({
          where: { teacherId, isActive: true },
          include: {
            _count: {
              select: {
                students: { where: { student: { isActive: true } } },
              },
            },
          },
        });
        const studentsCount = groups.reduce((s, g) => s + g._count.students, 0);
        const rate = Number(teacher.ratePerStudent);
        months.push({
          month: monthLabel,
          studentsCount,
          ratePerStudent: rate,
          totalSalary: studentsCount * rate,
        });
      } else {
        // Historical — count active students in that period via attendance
        const uniqueStudents = await this.prisma.attendance.findMany({
          where: {
            group: { teacherId },
            date: { gte: monthStart, lte: monthEnd },
          },
          select: { studentId: true },
          distinct: ['studentId'],
        });
        const rate = Number(teacher.ratePerStudent);
        const studentsCount = uniqueStudents.length;
        months.push({
          month: monthLabel,
          studentsCount,
          ratePerStudent: rate,
          totalSalary: studentsCount * rate,
        });
      }
    }

    return {
      teacherId,
      fullName: teacher.fullName,
      currentRate: Number(teacher.ratePerStudent),
      history: months,
    };
  }

  // ── Update rate ──────────────────────────────────────────────────────────

  async updateRate(teacherId: string, rate: number, actorId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const oldRate = Number(teacher.ratePerStudent);

    const updated = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { ratePerStudent: rate },
      select: { id: true, fullName: true, ratePerStudent: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        entity: 'Teacher',
        entityId: teacherId,
        details: {
          field: 'ratePerStudent',
          oldValue: oldRate,
          newValue: rate,
        } as any,
      },
    });

    // Notify the teacher only if the rate actually changed.
    if (oldRate !== rate) {
      await this.notificationsQueue.add('send-salary-notification', {
        teacherId,
        oldRate,
        newRate: rate,
      });
    }

    return updated;
  }
}
