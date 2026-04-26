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
import { GradesService } from '../grades/grades.service';
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
  user: { select: { id: true, phone: true, role: true, isActive: true } },
};

@Injectable()
export class ParentsService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private gradesService: GradesService,
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
      groups: {
        orderBy: { joinedAt: 'asc' },
        select: {
          monthlyFee: true,
          joinedAt: true,
          group: {
            select: {
              id: true,
              name: true,
              schedule: true,
              teacher: { select: { fullName: true, phone: true } },
            },
          },
        },
      },
    } as const;
  }

  // Reshape the raw child row from `childSelect()` into the legacy-flat
  // structure the parent UI expects: a single `group` (= primary group)
  // plus an aggregate `monthlyFee` (= sum across all groups). The full
  // multi-group breakdown is also exposed via `groups` so newer screens
  // can render every enrollment separately.
  private shapeChild<
    T extends {
      groups: Array<{
        monthlyFee: unknown;
        joinedAt: Date;
        group: {
          id: string;
          name: string;
          schedule: unknown;
          teacher: { fullName: string; phone: string | null };
        };
      }>;
    },
  >(child: T) {
    const groups = child.groups.map((link) => ({
      id: link.group.id,
      name: link.group.name,
      schedule: link.group.schedule,
      teacher: link.group.teacher,
      monthlyFee: Number(link.monthlyFee),
      joinedAt: link.joinedAt,
    }));
    const monthlyFee = groups.reduce((acc, g) => acc + g.monthlyFee, 0);
    const primary = groups[0] ?? null;
    const { groups: _omit, ...rest } = child;
    return {
      ...rest,
      monthlyFee,
      group: primary
        ? {
            id: primary.id,
            name: primary.name,
            schedule: primary.schedule,
            teacher: primary.teacher,
          }
        : null,
      groups,
    };
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
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new ConflictException('Phone already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const parent = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: dto.phone,
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
        details: { phone: dto.phone, studentIds },
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
                phone: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            },
            { phone: { contains: query.search } },
          ],
        }
      : {};

    const parents = await this.prisma.parent.findMany({
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
                groups: {
                  orderBy: { joinedAt: 'asc' },
                  take: 1,
                  select: { group: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
      },
    });
    return parents.map((p) => ({
      ...p,
      students: p.students.map((s) => ({
        student: {
          id: s.student.id,
          fullName: s.student.fullName,
          isActive: s.student.isActive,
          group: s.student.groups[0]?.group ?? null,
        },
      })),
    }));
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
                groups: {
                  orderBy: { joinedAt: 'asc' },
                  take: 1,
                  select: { group: { select: { id: true, name: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!parent) throw new NotFoundException('Parent not found');
    return {
      ...parent,
      students: parent.students.map((s) => ({
        createdAt: s.createdAt,
        student: {
          id: s.student.id,
          fullName: s.student.fullName,
          isActive: s.student.isActive,
          group: s.student.groups[0]?.group ?? null,
        },
      })),
    };
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
      select: { id: true, userId: true, user: { select: { phone: true } } },
    });
    if (!parent) throw new NotFoundException('Parent not found');

    const data: { phone?: string; passwordHash?: string } = {};

    if (payload.phone && payload.phone !== parent.user.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: payload.phone },
      });
      if (existing && existing.id !== parent.userId) {
        throw new ConflictException('Phone already in use');
      }
      data.phone = payload.phone;
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

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parent.userId },
        data,
      });
      if (data.phone) {
        await tx.parent.update({
          where: { id: parent.id },
          data: { phone: data.phone },
        });
      }
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
          phoneChanged: Boolean(data.phone),
          passwordChanged: Boolean(data.passwordHash),
        },
      },
    });

    return { ok: true, phoneChanged: Boolean(data.phone) };
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
        user: { select: { phone: true } },
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
      // Login phone (User.phone) — kept in sync with parent.phone.
      fullName: parent.fullName,
      phone: parent.phone ?? parent.user.phone,
      // Flatten the join table so the frontend gets a clean list of children.
      children: parent.students.map((s) => this.shapeChild(s.student)),
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
    const links = await this.prisma.studentGroup.findMany({
      where: { studentId },
      select: { groupId: true },
    });
    if (links.length === 0) return [];

    return this.prisma.homework.findMany({
      where: { groupId: { in: links.map((l) => l.groupId) } },
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

  // Mirror of the student's `/grades/my/rating` for the parent's selected
  // child, so the parent achievements page can show the same group podium
  // the student sees in their own panel.
  async getChildRating(
    userId: string,
    query: { period?: 'month' | 'quarter' | 'all'; studentId?: string },
  ) {
    const studentId = await this.resolveChildId(userId, query.studentId);
    // With multi-group enrollment we still display a single podium for the
    // child — the primary (first joined) group. Picking one is intentional:
    // the parent UI assumes one rating per child.
    const link = await this.prisma.studentGroup.findFirst({
      where: { studentId },
      orderBy: { joinedAt: 'asc' },
      select: { groupId: true, student: { select: { id: true } } },
    });

    if (!link) {
      return {
        myPlace: 0,
        totalStudents: 0,
        myAverageScore: 0,
        myTotalPoints: 0,
        isVisible: false,
        rating: [],
      };
    }

    const group = await this.prisma.group.findUnique({
      where: { id: link.groupId },
      select: { isRatingVisible: true },
    });
    if (!group) {
      return {
        myPlace: 0,
        totalStudents: 0,
        myAverageScore: 0,
        myTotalPoints: 0,
        isVisible: false,
        rating: [],
      };
    }

    const ratingList = await this.gradesService.getRating(
      link.groupId,
      { period: query.period as any },
      { id: userId, role: Role.PARENT },
    );

    const myEntry = ratingList.find((r) => r.studentId === link.student.id);

    return {
      myPlace: myEntry ? myEntry.place : 0,
      totalStudents: ratingList.length,
      myAverageScore: myEntry ? myEntry.averageScore : 0,
      myTotalPoints: myEntry ? myEntry.totalPoints : 0,
      isVisible: group.isRatingVisible,
      rating: group.isRatingVisible ? ratingList : [],
    };
  }
}
