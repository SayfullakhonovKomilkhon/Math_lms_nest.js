import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

const groupSelect = {
  id: true,
  name: true,
  maxStudents: true,
  schedule: true,
  defaultMonthlyFee: true,
  isActive: true,
  isRatingVisible: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: { id: true, fullName: true } },
  _count: { select: { students: true } },
} satisfies Prisma.GroupSelect;

type RawGroup = Prisma.GroupGetPayload<{ select: typeof groupSelect }>;

// Decimal -> number so the API consumers don't need to deal with serialised
// Prisma Decimal strings.
function shapeGroup(g: RawGroup) {
  return {
    ...g,
    defaultMonthlyFee: Number(g.defaultMonthlyFee),
  };
}

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
        defaultMonthlyFee: dto.defaultMonthlyFee ?? 0,
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

    return shapeGroup(group);
  }

  async findAll(user: { id: string; role: Role }) {
    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: user.id },
      });
      if (!teacher) return [];
      const rows = await this.prisma.group.findMany({
        where: { teacherId: teacher.id },
        select: groupSelect,
      });
      return rows.map(shapeGroup);
    }

    const rows = await this.prisma.group.findMany({ select: groupSelect });
    return rows.map(shapeGroup);
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

    return shapeGroup(group);
  }

  async findStudents(groupId: string, user: { id: string; role: Role }) {
    await this.findOne(groupId, user);

    // Pull each StudentGroup link and the per-link fee, then expose the
    // student row + that fee so the UI shows "the price the student pays
    // *for this group*" — independent of any other groups they're in.
    const links = await this.prisma.studentGroup.findMany({
      where: { groupId },
      select: {
        monthlyFee: true,
        joinedAt: true,
        student: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            gender: true,
            isActive: true,
            user: { select: { phone: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const studentIds = links.map((l) => l.student.id);

    const paidThisMonth =
      studentIds.length > 0
        ? await this.prisma.payment.findMany({
            where: {
              studentId: { in: studentIds },
              status: PaymentStatus.CONFIRMED,
              confirmedAt: { gte: startOfMonth },
            },
            select: { studentId: true },
          })
        : [];
    const paidSet = new Set(paidThisMonth.map((p) => p.studentId));

    return links.map((link) => ({
      ...link.student,
      monthlyFee: Number(link.monthlyFee),
      joinedAt: link.joinedAt,
      hasPaidThisMonth: paidSet.has(link.student.id),
    }));
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

    return shapeGroup(updated);
  }

  async archive(id: string, actorId: string) {
    const existing = await this.prisma.group.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Group not found');
    }

    const archived = await this.prisma.group.update({
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

    return shapeGroup(archived);
  }
  async updateRatingVisibility(
    id: string,
    isRatingVisible: boolean,
    user: { id: string; role: Role },
  ) {
    const group = await this.findOne(id, user);

    const visibilityUpdated = await this.prisma.group.update({
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

    return shapeGroup(visibilityUpdated);
  }
}
