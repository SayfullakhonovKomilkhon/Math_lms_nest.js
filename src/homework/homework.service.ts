import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';

const hwSelect = {
  id: true,
  text: true,
  imageUrls: true,
  youtubeUrl: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  group: { select: { id: true, name: true } },
  teacher: { select: { id: true, fullName: true } },
};

@Injectable()
export class HomeworkService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  private async getTeacher(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');
    return teacher;
  }

  private async assertTeacherOwnsGroup(userId: string, groupId: string) {
    const teacher = await this.getTeacher(userId);
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    if (group.teacherId !== teacher.id)
      throw new ForbiddenException('You can only manage your own groups');
    return teacher;
  }

  async create(dto: CreateHomeworkDto, user: { id: string; role: Role }) {
    const teacher = await this.assertTeacherOwnsGroup(user.id, dto.groupId);

    const homework = await this.prisma.homework.create({
      data: {
        groupId: dto.groupId,
        teacherId: teacher.id,
        text: dto.text,
        imageUrls: dto.imageUrls ?? [],
        youtubeUrl: dto.youtubeUrl,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      select: hwSelect,
    });

    await this.notificationsQueue.add('send-homework-notification', {
      groupId: dto.groupId,
      homeworkId: homework.id,
    });

    return homework;
  }

  async findAll(groupId: string, user: { id: string; role: Role }) {
    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      const link = student
        ? await this.prisma.studentGroup.findUnique({
            where: {
              studentId_groupId: { studentId: student.id, groupId },
            },
            select: { studentId: true },
          })
        : null;
      if (!link)
        throw new ForbiddenException(
          'You can only view your own group homework',
        );
    }

    if (user.role === Role.PARENT) {
      const link = await this.prisma.parentStudent.findFirst({
        where: {
          parent: { userId: user.id },
          student: { groups: { some: { groupId } } },
        },
        select: { parentId: true },
      });
      if (!link)
        throw new ForbiddenException(
          "You can only view your child's group homework",
        );
    }

    return this.prisma.homework.findMany({
      where: { groupId },
      select: hwSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatest(groupId: string, user?: { id: string; role: Role }) {
    if (user?.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      const link = student
        ? await this.prisma.studentGroup.findUnique({
            where: {
              studentId_groupId: { studentId: student.id, groupId },
            },
            select: { studentId: true },
          })
        : null;
      if (!link) {
        throw new ForbiddenException(
          'You can only view your own group homework',
        );
      }
    }

    if (user?.role === Role.PARENT) {
      const link = await this.prisma.parentStudent.findFirst({
        where: {
          parent: { userId: user.id },
          student: { groups: { some: { groupId } } },
        },
        select: { parentId: true },
      });
      if (!link) {
        throw new ForbiddenException(
          "You can only view your child's group homework",
        );
      }
    }

    return this.prisma.homework.findFirst({
      where: { groupId },
      select: hwSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMy(limit: number, userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) return [];
    const groupIds = await this.prisma.studentGroup
      .findMany({
        where: { studentId: student.id },
        select: { groupId: true },
      })
      .then((rows) => rows.map((r) => r.groupId));
    if (groupIds.length === 0) return [];

    return this.prisma.homework.findMany({
      where: { groupId: { in: groupIds } },
      select: hwSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findMyLatest(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!student) return null;
    // Latest homework across any of the student's groups.
    const groupIds = await this.prisma.studentGroup
      .findMany({
        where: { studentId: student.id },
        select: { groupId: true },
      })
      .then((rows) => rows.map((r) => r.groupId));
    if (groupIds.length === 0) return null;
    return this.prisma.homework.findFirst({
      where: { groupId: { in: groupIds } },
      select: hwSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    dto: UpdateHomeworkDto,
    user: { id: string; role: Role },
  ) {
    const hw = await this.prisma.homework.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException('Homework not found');

    const teacher = await this.getTeacher(user.id);
    if (hw.teacherId !== teacher.id)
      throw new ForbiddenException('You can only edit your own homework');

    return this.prisma.homework.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      select: hwSelect,
    });
  }

  async remove(id: string, user: { id: string; role: Role }) {
    const hw = await this.prisma.homework.findUnique({ where: { id } });
    if (!hw) throw new NotFoundException('Homework not found');

    if (user.role === Role.TEACHER) {
      const teacher = await this.getTeacher(user.id);
      if (hw.teacherId !== teacher.id)
        throw new ForbiddenException('You can only delete your own homework');
    }

    await this.prisma.homework.delete({ where: { id } });
    return { deleted: true };
  }
}
