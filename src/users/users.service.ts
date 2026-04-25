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
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
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
        email: true,
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
        email: true,
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
            select: { id: true, email: true, isActive: true, createdAt: true },
          },
          groups: {
            where: { isActive: true },
            include: {
              _count: { select: { students: { where: { isActive: true } } } },
            },
          },
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true, email: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      teachers: teachers.map((t) => ({
        id: t.id,
        userId: t.userId,
        fullName: t.fullName,
        phone: t.phone,
        email: t.user.email,
        isActive: t.isActive,
        ratePerStudent: Number(t.ratePerStudent),
        studentsCount: t.groups.reduce((s, g) => s + g._count.students, 0),
        createdAt: t.user.createdAt,
      })),
      admins: admins.map((a) => ({
        id: a.id,
        fullName: null,
        email: a.email,
        isActive: a.isActive,
        createdAt: a.createdAt,
      })),
    };
  }

  async createStaff(dto: {
    email: string;
    password: string;
    role: 'TEACHER' | 'ADMIN';
    fullName?: string;
    phone?: string;
  }) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: dto.role as Role,
        },
      });

      if (dto.role === 'TEACHER') {
        await tx.teacher.create({
          data: {
            userId: newUser.id,
            fullName: dto.fullName ?? dto.email,
            phone: dto.phone ?? null,
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
    dto: { email?: string; password?: string },
    actorId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const data: { email?: string; passwordHash?: string } = {};

    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException('Email already in use');
      }
      data.email = dto.email;
    }

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (Object.keys(data).length === 0) {
      const { passwordHash: _, ...rest } = user;
      return rest;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: id,
        details: {
          emailChanged: Boolean(data.email),
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
      select: { id: true, email: true, role: true, isActive: true },
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
        include: { user: { select: { email: true, role: true } } },
      }),
    ]);

    return { total, records };
  }
}
