import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { UpdateParentCredentialsDto } from './dto/update-credentials.dto';

const parentSummarySelect = {
  id: true,
  fullName: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, role: true, isActive: true } },
};

@Injectable()
export class ParentsService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  // ---------- Helpers --------------------------------------------------

  // Resolve a list of children studentIds the parent identified by userId
  // is allowed to access. Throws if the parent has no linked children.
  private async getOwnChildIds(userId: string): Promise<string[]> {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      select: {
        id: true,
        students: {
          select: { studentId: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!parent) throw new NotFoundException('Parent profile not found');
    return parent.students.map((s) => s.studentId);
  }

  // Pick which child this request operates on. If `studentId` is provided,
  // it must belong to the parent. If absent, fall back to the first linked
  // child (oldest link), preserving behaviour for parents with one child.
  private async resolveChildId(
    userId: string,
    studentId: string | undefined,
  ): Promise<string> {
    const childIds = await this.getOwnChildIds(userId);
    if (childIds.length === 0) {
      throw new NotFoundException('No children linked to this parent');
    }
    if (studentId) {
      if (!childIds.includes(studentId)) {
        throw new ForbiddenException('This child does not belong to you');
      }
      return studentId;
    }
    return childIds[0];
  }

  private childSelect() {
    return {
      id: true,
      fullName: true,
      gender: true,
      enrolledAt: true,
      isActive: true,
      monthlyFee: true,
      group: {
        select: {
          id: true,
          name: true,
          schedule: true,
          teacher: { select: { fullName: true, phone: true } },
        },
      },
    } as const;
  }

  // ---------- Admin/SuperAdmin CRUD -----------------------------------

  async create(dto: CreateParentDto, actorId: string) {
    // Backwards-compat: collapse legacy studentId into studentIds[].
    const studentIds = Array.from(
      new Set(
        [...(dto.studentIds ?? []), ...(dto.studentId ? [dto.studentId] : [])],
      ),
    );

    if (studentIds.length > 0) {
      const found = await this.prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true },
      });
      if (found.length !== studentIds.length) {
        throw new NotFoundException('One or more students were not found');
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
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

      const created = await tx.parent.create({
        data: {
          userId: user.id,
          fullName: dto.fullName,
          phone: dto.phone,
        },
      });

      if (studentIds.length > 0) {
        await tx.parentStudent.createMany({
          data: studentIds.map((sid) => ({
            parentId: created.id,
            studentId: sid,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        entity: 'Parent',
        entityId: parent.id,
        details: { email: dto.email, studentIds },
      },
    });

    return this.findOne(parent.id);
  }

  async findAll(query: { search?: string } = {}) {
    const where = query.search
      ? {
          OR: [
            {
              fullName: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              user: {
                email: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            },
            { phone: { contains: query.search } },
          ],
        }
      : {};

    return this.prisma.parent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        ...parentSummarySelect,
        students: {
          select: {
            student: {
              select: {
                id: true,
                fullName: true,
                isActive: true,
                group: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id },
      select: {
        ...parentSummarySelect,
        students: {
          select: {
            createdAt: true,
            student: {
              select: {
                id: true,
                fullName: true,
                isActive: true,
                group: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!parent) throw new NotFoundException('Parent not found');
    return parent;
  }

  async update(id: string, dto: UpdateParentDto, actorId: string) {
    const existing = await this.prisma.parent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Parent not found');

    await this.prisma.parent.update({
      where: { id },
      data: dto,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        entity: 'Parent',
        entityId: id,
        details: dto as object,
      },
    });

    return this.findOne(id);
  }

  async updateCredentials(
    parentId: string,
    payload: UpdateParentCredentialsDto,
    actorId: string,
  ) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      select: { id: true, userId: true, user: { select: { email: true } } },
    });
    if (!parent) throw new NotFoundException('Parent not found');

    const data: { email?: string; passwordHash?: string } = {};

    if (payload.email && payload.email !== parent.user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });
      if (existing && existing.id !== parent.userId) {
        throw new ConflictException('Email already in use');
      }
      data.email = payload.email;
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

    await this.prisma.user.update({
      where: { id: parent.userId },
      data,
    });

    if (data.passwordHash) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: parent.userId },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE_CREDENTIALS',
        entity: 'Parent',
        entityId: parentId,
        details: {
          emailChanged: Boolean(data.email),
          passwordChanged: Boolean(data.passwordHash),
        },
      },
    });

    return { ok: true, emailChanged: Boolean(data.email) };
  }

  async linkStudent(parentId: string, studentId: string, actorId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
    });
    if (!parent) throw new NotFoundException('Parent not found');

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: {},
      create: { parentId, studentId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'LINK',
        entity: 'Parent',
        entityId: parentId,
        details: { studentId },
      },
    });

    return this.findOne(parentId);
  }

  async unlinkStudent(parentId: string, studentId: string, actorId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
    });
    if (!parent) throw new NotFoundException('Parent not found');

    await this.prisma.parentStudent.deleteMany({
      where: { parentId, studentId },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'UNLINK',
        entity: 'Parent',
        entityId: parentId,
        details: { studentId },
      },
    });

    return this.findOne(parentId);
  }

  // ---------- Parent-facing endpoints ---------------------------------

  async findMyProfile(userId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        user: { select: { email: true } },
        students: {
          orderBy: { createdAt: 'asc' },
          select: {
            student: { select: this.childSelect() },
          },
        },
      },
    });
    if (!parent) throw new NotFoundException('Parent profile not found');

    return {
      id: parent.id,
      fullName: parent.fullName,
      phone: parent.phone,
      email: parent.user.email,
      // Flatten the join table so the frontend gets a clean list of children.
      children: parent.students.map((s) => s.student),
    };
  }

  async getChildAttendance(
    userId: string,
    query: { from?: string; to?: string; studentId?: string },
  ) {
    const studentId = await this.resolveChildId(userId, query.studentId);
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
    query: {
      from?: string;
      to?: string;
      lessonType?: string;
      studentId?: string;
    },
  ) {
    const studentId = await this.resolveChildId(userId, query.studentId);
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

  async getChildHomework(
    userId: string,
    query: { studentId?: string } = {},
  ) {
    const studentId = await this.resolveChildId(userId, query.studentId);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student || !student.groupId) return [];

    return this.prisma.homework.findMany({
      where: { groupId: student.groupId },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { teacher: { select: { fullName: true } } },
    });
  }

  async getChildPayments(
    userId: string,
    query: { studentId?: string } = {},
  ) {
    const studentId = await this.resolveChildId(userId, query.studentId);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    return this.paymentsService.findMy(student!.userId);
  }

  async uploadChildReceipt(
    userId: string,
    file: Express.Multer.File,
    studentId?: string,
  ) {
    const childId = await this.resolveChildId(userId, studentId);
    return this.paymentsService.uploadReceipt(file, childId, userId);
  }
}
