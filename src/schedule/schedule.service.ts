import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async getMySchedule(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: {
        group: {
          include: {
            teacher: { select: { fullName: true, phone: true } },
          },
        },
      },
    });
    if (!student) throw new ForbiddenException('Student profile not found');
    if (!student.group) return { schedule: null, nextTopic: null };

    const nextTopic = await this.prisma.lessonTopic.findFirst({
      where: {
        groupId: student.group.id,
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
    });

    return {
      groupId: student.group.id,
      groupName: student.group.name,
      schedule: student.group.schedule,
      teacher: {
        fullName: student.group.teacher.fullName,
        phone: student.group.teacher.phone,
      },
      nextTopic: nextTopic
        ? { date: nextTopic.date, topic: nextTopic.topic, materials: nextTopic.materials }
        : null,
    };
  }

  async getGroupSchedule(groupId: string, user: { id: string; role: Role }) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        teacher: { select: { id: true, fullName: true, phone: true, userId: true } },
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
