import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

const groupSelect = {
  id: true,
  name: true,
  maxStudents: true,
  schedule: true,
  isActive: true,
  isRatingVisible: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: { id: true, fullName: true } },
  _count: { select: { students: true } },
} satisfies Prisma.GroupSelect;

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateGroupDto, actorId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: dto.teacherId },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        teacherId: dto.teacherId,
        maxStudents: dto.maxStudents ?? 20,
        schedule: dto.schedule as Prisma.InputJsonValue,
      },
      select: groupSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        entity: 'Group',
        entityId: group.id,
        details: { name: dto.name } as Prisma.InputJsonValue,
      },
    });

    return group;
  }

  async findAll(user: { id: string; role: Role }) {
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: user.id },
      });
      if (!teacher) return [];
      return this.prisma.group.findMany({
        where: { teacherId: teacher.id },
        select: groupSelect,
      });
    }

    return this.prisma.group.findMany({ select: groupSelect });
  }

  async findOne(id: string, user: { id: string; role: Role }) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: groupSelect,
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: user.id },
      });
      if (!teacher || group.teacher.id !== teacher.id) {
        throw new ForbiddenException('You can only access your own groups');
      }
    }

    return group;
  }

  async findStudents(groupId: string, user: { id: string; role: Role }) {
    await this.findOne(groupId, user);

    return this.prisma.student.findMany({
      where: { groupId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        gender: true,
        isActive: true,
        monthlyFee: true,
        user: { select: { email: true } },
      },
    });
  }

  async update(id: string, dto: UpdateGroupDto, actorId: string) {
    const existing = await this.prisma.group.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Group not found');
    }

    const { teacherId, schedule, ...rest } = dto;

    const updated = await this.prisma.group.update({
      where: { id },
      data: {
        ...rest,
        ...(teacherId && { teacher: { connect: { id: teacherId } } }),
        ...(schedule && { schedule: schedule as Prisma.InputJsonValue }),
      },
      select: groupSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        entity: 'Group',
        entityId: id,
        details: dto as unknown as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  async archive(id: string, actorId: string) {
    const existing = await this.prisma.group.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Group not found');
    }

    const updated = await this.prisma.group.update({
      where: { id },
      data: { isActive: false, archivedAt: new Date() },
      select: groupSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'ARCHIVE',
        entity: 'Group',
        entityId: id,
      },
    });

    return updated;
  }
  async updateRatingVisibility(id: string, isRatingVisible: boolean, user: { id: string; role: Role }) {
    const group = await this.findOne(id, user);

    const updated = await this.prisma.group.update({
      where: { id: group.id },
      data: { isRatingVisible },
      select: groupSelect,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_RATING_VISIBILITY',
        entity: 'Group',
        entityId: id,
        details: { isRatingVisible } as Prisma.InputJsonValue,
      },
    });

    return updated;
  }
}
