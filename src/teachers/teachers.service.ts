import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { SettingsService } from '../settings/settings.service';

const teacherSelect = {
  id: true,
  fullName: true,
  phone: true,
  ratePerStudent: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, role: true, isActive: true } },
};

@Injectable()
export class TeachersService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async create(dto: CreateTeacherDto, actorId: string) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // If the operator did not pass an explicit rate, fall back to the
    // center-wide default configured in /superadmin/settings.
    let ratePerStudent = dto.ratePerStudent;
    if (ratePerStudent === undefined || ratePerStudent === null) {
      const def = await this.settings.getValue('default_rate_per_student');
      const parsed = def ? Number(def) : NaN;
      ratePerStudent = Number.isFinite(parsed) ? parsed : 0;
    }

    const teacher = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: Role.TEACHER,
        },
      });

      return tx.teacher.create({
        data: {
          userId: user.id,
          fullName: dto.fullName,
          phone: dto.phone,
          ratePerStudent,
        },
        select: teacherSelect,
      });
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        entity: 'Teacher',
        entityId: teacher.id,
        details: { email: dto.email, fullName: dto.fullName },
      },
    });

    return teacher;
  }

  async findAll() {
    return this.prisma.teacher.findMany({ select: teacherSelect });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: teacherSelect,
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }

  async update(id: string, dto: UpdateTeacherDto, actorId: string) {
    const existing = await this.prisma.teacher.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Teacher not found');
    }

    const updated = await this.prisma.teacher.update({
      where: { id },
      data: dto,
      select: teacherSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        entity: 'Teacher',
        entityId: id,
        details: dto as object,
      },
    });

    return updated;
  }

  async deactivate(id: string, actorId: string) {
    const existing = await this.prisma.teacher.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Teacher not found');
    }

    const updated = await this.prisma.teacher.update({
      where: { id },
      data: { isActive: false },
      select: teacherSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'DEACTIVATE',
        entity: 'Teacher',
        entityId: id,
      },
    });

    return updated;
  }
}
