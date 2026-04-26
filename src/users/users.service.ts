import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (exists) throw new ConflictException('Phone already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        passwordHash,
        role: dto.role,
        telegramChatId: dto.telegramChatId,
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findAll(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role: role as any } : undefined,
      select: {
        id: true,
        phone: true,
        role: true,
        isActive: true,
        telegramChatId: true,
        createdAt: true,
        updatedAt: true,
        teacher: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            ratePerStudent: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        role: true,
        isActive: true,
        telegramChatId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Staff ────────────────────────────────────────────────────────────────

  async getStaff() {
    const [teachers, admins] = await Promise.all([
      this.prisma.teacher.findMany({
        include: {
          user: {
            select: { id: true, phone: true, isActive: true, createdAt: true },
          },
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
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true, phone: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      teachers: teachers.map((t) => ({
        id: t.id,
        userId: t.userId,
        fullName: t.fullName,
        phone: t.phone ?? t.user.phone,
        isActive: t.isActive,
        ratePerStudent: Number(t.ratePerStudent),
        studentsCount: t.groups.reduce((s, g) => s + g._count.students, 0),
        createdAt: t.user.createdAt,
      })),
      admins: admins.map((a) => ({
        id: a.id,
        fullName: null,
        phone: a.phone,
        isActive: a.isActive,
        createdAt: a.createdAt,
      })),
    };
  }

  async createStaff(dto: {
    phone: string;
    password: string;
    role: 'TEACHER' | 'ADMIN';
    fullName?: string;
  }) {
    const exists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (exists) throw new ConflictException('Phone already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: dto.phone,
          passwordHash,
          role: dto.role as Role,
        },
      });

      if (dto.role === 'TEACHER') {
        await tx.teacher.create({
          data: {
            userId: newUser.id,
            fullName: dto.fullName ?? dto.phone,
            phone: dto.phone,
          },
        });
      }

      return newUser;
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  // ── Update credentials ───────────────────────────────────────────────────

  async updateCredentials(
    id: string,
    dto: { phone?: string; password?: string },
    actorId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: { phone?: string; passwordHash?: string } = {};

    if (dto.phone && dto.phone !== user.phone) {
      const exists = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException('Phone already in use');
      }
      data.phone = dto.phone;
    }

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (Object.keys(data).length === 0) {
      const { passwordHash: _, ...rest } = user;
      return rest;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data,
        select: {
          id: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      // Mirror onto Teacher.phone / Parent.phone / Student.phone so the
      // role-table contact phone never drifts from the login phone.
      if (data.phone) {
        await tx.teacher.updateMany({
          where: { userId: id },
          data: { phone: data.phone },
        });
        await tx.student.updateMany({
          where: { userId: id },
          data: { phone: data.phone },
        });
        await tx.parent.updateMany({
          where: { userId: id },
          data: { phone: data.phone },
        });
      }
      return u;
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: id,
        details: {
          phoneChanged: Boolean(data.phone),
          passwordChanged: Boolean(data.passwordHash),
        },
      },
    });

    return updated;
  }

  // ── Deactivate ───────────────────────────────────────────────────────────

  async deactivate(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, phone: true, role: true, isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'DEACTIVATE_USER',
        entity: 'User',
        entityId: id,
      },
    });

    return updated;
  }

  // ── Audit log ────────────────────────────────────────────────────────────

  async getAuditLog(params: {
    limit: number;
    offset: number;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
  }) {
    const where: any = {};
    if (params.action)
      where.action = { contains: params.action, mode: 'insensitive' };
    if (params.userId) where.userId = params.userId;
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }

    const [total, records] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        take: params.limit,
        skip: params.offset,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { phone: true, role: true } } },
      }),
    ]);

    return { total, records };
  }
}
