import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async getMySchedule(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        groups: {
          orderBy: { joinedAt: 'asc' },
          include: {
            group: {
              include: {
                teacher: { select: { fullName: true, phone: true } },
              },
            },
          },
        },
      },
    });
    if (!student) throw new ForbiddenException('Student profile not found');
    // The schedule view only renders one group; pick the primary (first
    // joined) one. A future iteration can return all groups so the student
    // sees a stitched calendar across them.
    const primary = student.groups[0]?.group;
    if (!primary) return { schedule: null, nextTopic: null };

    const nextTopic = await this.prisma.lessonTopic.findFirst({
      where: {
        groupId: primary.id,
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
    });

    return {
      groupId: primary.id,
      groupName: primary.name,
      schedule: primary.schedule,
      teacher: {
        fullName: primary.teacher.fullName,
        phone: primary.teacher.phone,
      },
      nextTopic: nextTopic
        ? {
            date: nextTopic.date,
            topic: nextTopic.topic,
            materials: nextTopic.materials,
          }
        : null,
    };
  }

  async getGroupSchedule(groupId: string, user: { id: string; role: Role }) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        teacher: {
          select: { id: true, fullName: true, phone: true, userId: true },
        },
      },
    });
    if (!group) throw new NotFoundException('Group not found');

    if (user.role === Role.TEACHER) {
      if (group.teacher.userId !== user.id)
        throw new ForbiddenException('You can only view your own groups');
    }

    const nextTopic = await this.prisma.lessonTopic.findFirst({
      where: { groupId, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
    });

    return {
      groupId: group.id,
      groupName: group.name,
      schedule: group.schedule,
      teacher: { fullName: group.teacher.fullName, phone: group.teacher.phone },
      nextTopic: nextTopic
        ? { date: nextTopic.date, topic: nextTopic.topic }
        : null,
    };
  }
}
