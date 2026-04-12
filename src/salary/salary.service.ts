import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SalaryService {
  constructor(private prisma: PrismaService) {}

  async getMySalary(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: {
        groups: {
          where: { isActive: true },
          include: {
            _count: { select: { students: { where: { isActive: true } } } },
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
            _count: { select: { students: { where: { isActive: true } } } },
          },
        },
      },
    });

    return teachers.map((t) => {
      const studentCount = t.groups.reduce((sum, g) => sum + g._count.students, 0);
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
}
