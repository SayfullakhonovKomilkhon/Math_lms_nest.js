import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';

const parentSelect = {
  id: true,
  fullName: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, role: true, isActive: true } },
  student: { select: { id: true, fullName: true, groupId: true } },
};

@Injectable()
export class ParentsService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  async create(dto: CreateParentDto, actorId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const parent = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: Role.PARENT,
        },
      });

      return tx.parent.create({
        data: {
          userId: user.id,
          fullName: dto.fullName,
          phone: dto.phone,
          studentId: dto.studentId,
        },
        select: parentSelect,
      });
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        entity: 'Parent',
        entityId: parent.id,
        details: { email: dto.email, studentId: dto.studentId },
      },
    });

    return parent;
  }

  async findOne(id: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      select: parentSelect,
    });
    if (!parent) {
      throw new NotFoundException('Parent not found');
    }
    return parent;
  }

  async findMyProfile(userId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        student: {
          select: {
            id: true,
            fullName: true,
            gender: true,
            enrolledAt: true,
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
        },
      },
    });
    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }
    return parent;
  }

  async getChildByIdGuard(userId: string) {
    const parent = await this.prisma.parent.findUnique({ where: { userId } });
    if (!parent) throw new NotFoundException('Parent profile not found');
    return parent.studentId;
  }

  async getChildAttendance(
    userId: string,
    query: { from?: string; to?: string },
  ) {
    const studentId = await this.getChildByIdGuard(userId);
    const where: any = { studentId };

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.attendance.findMany({
      where,
      include: { group: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getChildGrades(
    userId: string,
    query: { from?: string; to?: string; lessonType?: string },
  ) {
    const studentId = await this.getChildByIdGuard(userId);
    const where: any = { studentId };

    if (query.lessonType) where.lessonType = query.lessonType;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const grades = await this.prisma.grade.findMany({
      where,
      include: { group: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    return grades.map((g) => ({
      ...g,
      scorePercent:
        Number(g.maxScore) > 0
          ? Math.round((Number(g.score) / Number(g.maxScore)) * 100)
          : 0,
      groupName: g.group.name,
    }));
  }

  async getChildHomework(userId: string) {
    const studentId = await this.getChildByIdGuard(userId);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student || !student.groupId) return [];

    return this.prisma.homework.findMany({
      where: { groupId: student.groupId },
      orderBy: { createdAt: 'desc' },
      take: 6, // latest + 5 previous
      include: {
        teacher: { select: { fullName: true } },
      },
    });
  }

  async getChildPayments(userId: string) {
    const studentId = await this.getChildByIdGuard(userId);
    // Reuse PaymentsService findMy logic but for the child.
    // BUT findMy in PaymentsService takes userId, not studentId.
    // I can just reuse student's user.id!
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    return this.paymentsService.findMy(student!.userId);
  }

  async uploadChildReceipt(userId: string, file: Express.Multer.File) {
    const studentId = await this.getChildByIdGuard(userId);
    return this.paymentsService.uploadReceipt(file, studentId, userId);
  }

  async update(id: string, dto: UpdateParentDto, actorId: string) {
    const existing = await this.prisma.parent.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Parent not found');
    }

    return this.prisma.parent.update({
      where: { id },
      data: dto,
      select: parentSelect,
    });
  }
}
