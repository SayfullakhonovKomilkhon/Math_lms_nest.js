import { Injectable, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAnnouncementDto, user: { id: string; role: Role }) {
    // Teachers can only create for their own groups
    if (user.role === Role.TEACHER) {
      if (!dto.groupId) {
        throw new ForbiddenException('Teachers must specify a groupId');
      }
      const teacher = await this.prisma.teacher.findUnique({ where: { userId: user.id } });
      if (!teacher) throw new ForbiddenException('Teacher profile not found');
      const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
      if (!group || group.teacherId !== teacher.id) {
        throw new ForbiddenException('You can only create announcements for your own groups');
      }
    }

    return this.prisma.announcement.create({
      data: {
        title: dto.title,
        message: dto.message,
        authorId: user.id,
        groupId: dto.groupId || null,
      },
      include: {
        author: { select: { email: true } },
        group: { select: { id: true, name: true } },
      },
    });
  }

  async findMy(user: { id: string; role: Role }) {
    let groupId: string | null = null;

    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { userId: user.id } });
      groupId = student?.groupId ?? null;
    } else if (user.role === Role.PARENT) {
      const parent = await this.prisma.parent.findUnique({
        where: { userId: user.id },
        include: { student: true },
      });
      groupId = parent?.student?.groupId ?? null;
    } else if (user.role === Role.TEACHER) {
      // Teacher sees announcements they created + center-wide
      const teacher = await this.prisma.teacher.findUnique({ where: { userId: user.id } });
      if (!teacher) return [];
      const myGroups = await this.prisma.group.findMany({
        where: { teacherId: teacher.id },
        select: { id: true },
      });
      const groupIds = myGroups.map((g) => g.id);
      return this.prisma.announcement.findMany({
        where: {
          OR: [{ groupId: null }, { groupId: { in: groupIds } }],
        },
        include: {
          author: { select: { email: true } },
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }

    // Student / Parent
    return this.prisma.announcement.findMany({
      where: {
        OR: [{ groupId: null }, ...(groupId ? [{ groupId }] : [])],
      },
      include: {
        author: { select: { email: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async findAll() {
    return this.prisma.announcement.findMany({
      include: {
        author: { select: { email: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
