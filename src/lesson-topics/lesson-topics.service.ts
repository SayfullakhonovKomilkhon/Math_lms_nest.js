import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonTopicDto } from './dto/create-lesson-topic.dto';

@Injectable()
export class LessonTopicsService {
  constructor(private prisma: PrismaService) {}

  private async assertTeacherOwnsGroup(userId: string, groupId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.teacherId !== teacher.id)
      throw new ForbiddenException('You can only manage your own groups');
    return teacher;
  }

  async create(dto: CreateLessonTopicDto, user: { id: string; role: Role }) {
    const teacher = await this.assertTeacherOwnsGroup(user.id, dto.groupId);

    return this.prisma.lessonTopic.create({
      data: {
        groupId: dto.groupId,
        teacherId: teacher.id,
        date: new Date(dto.date),
        topic: dto.topic,
        materials: dto.materials as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
      include: {
        group: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true } },
      },
    });
  }

  async findAll(
    query: { groupId?: string; from?: string; to?: string },
    user: { id: string; role: Role },
  ) {
    if (user.role === Role.STUDENT && query.groupId) {
      const student = await this.prisma.student.findUnique({ where: { userId: user.id } });
      if (!student || student.groupId !== query.groupId)
        throw new ForbiddenException('You can only view your own group topics');
    }

    const where: Prisma.LessonTopicWhereInput = {};
    if (query.groupId) where.groupId = query.groupId;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) (where.date as any).gte = new Date(query.from);
      if (query.to) (where.date as any).lte = new Date(query.to);
    }

    return this.prisma.lessonTopic.findMany({
      where,
      include: {
        group: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findNext(groupId: string) {
    return this.prisma.lessonTopic.findFirst({
      where: {
        groupId,
        date: { gte: new Date() },
      },
      include: {
        group: { select: { id: true, name: true } },
        teacher: { select: { id: true, fullName: true } },
      },
      orderBy: { date: 'asc' },
    });
  }

  async findSuggestions(query: { q?: string; limit?: number }) {
    const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 300);
    const where: Prisma.LessonTopicWhereInput = {};
    if (query.q && query.q.trim()) {
      where.topic = { contains: query.q.trim(), mode: 'insensitive' };
    }

    const rows = await this.prisma.lessonTopic.findMany({
      where,
      select: { topic: true, date: true },
      orderBy: { date: 'desc' },
      take: limit * 4,
    });

    const seen = new Map<string, { topic: string; lastUsedAt: Date }>();
    for (const r of rows) {
      const key = r.topic.trim().toLowerCase();
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, { topic: r.topic, lastUsedAt: r.date });
      if (seen.size >= limit) break;
    }
    return Array.from(seen.values());
  }
}
