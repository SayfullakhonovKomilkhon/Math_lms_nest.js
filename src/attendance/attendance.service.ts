import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AttendanceStatus, Role } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { EditAttendanceDto } from './dto/edit-attendance.dto';
import {
  QueryAttendanceDto,
  SummaryQueryDto,
} from './dto/query-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  private async assertTeacherOwnsGroup(userId: string, groupId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    if (group.teacherId !== teacher.id)
      throw new ForbiddenException('You can only manage your own groups');
    return teacher;
  }

  async bulkCreate(dto: BulkAttendanceDto, user: { id: string; role: Role }) {
    if (user.role === Role.TEACHER) {
      await this.assertTeacherOwnsGroup(user.id, dto.groupId);
    }

    const date = new Date(dto.date);

    const results = await this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.attendance.upsert({
          where: {
            studentId_groupId_date: {
              studentId: r.studentId,
              groupId: dto.groupId,
              date,
            },
          },
          create: {
            studentId: r.studentId,
            groupId: dto.groupId,
            date,
            lessonType: dto.lessonType,
            status: r.status,
          },
          update: {
            status: r.status,
            lessonType: dto.lessonType,
          },
        }),
      ),
    );

    // Enqueue absence alerts for ABSENT students
    const absentRecords = dto.records.filter(
      (r) => r.status === AttendanceStatus.ABSENT,
    );
    for (const r of absentRecords) {
      await this.notificationsQueue.add('send-absence-alert', {
        studentId: r.studentId,
        date: dto.date,
      });
    }

    return { saved: results.length };
  }

  async findAll(query: QueryAttendanceDto, user: { id: string; role: Role }) {
    const where: any = {};

    if (user.role === Role.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: user.id },
      });
      if (!teacher) throw new ForbiddenException('Teacher profile not found');

      const myGroups = await this.prisma.group.findMany({
        where: { teacherId: teacher.id },
        select: { id: true },
      });
      const myGroupIds = myGroups.map((g) => g.id);
      if (myGroupIds.length === 0) return [];

      if (query.groupId) {
        if (!myGroupIds.includes(query.groupId))
          throw new ForbiddenException('Access denied to this group');
        where.groupId = query.groupId;
      } else {
        where.groupId = { in: myGroupIds };
      }
    } else if (query.groupId) {
      where.groupId = query.groupId;
    }
    if (query.studentId) where.studentId = query.studentId;
    if (query.date) where.date = new Date(query.date);
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findMy(
    query: { from?: string; to?: string; groupId?: string },
    userId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    const where: any = { studentId: student.id };
    if (query.groupId) where.groupId = query.groupId;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        group: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async update(
    id: string,
    dto: EditAttendanceDto,
    user: { id: string; role: Role },
  ) {
    const record = await this.prisma.attendance.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Attendance record not found');

    if (user.role === Role.TEACHER) {
      await this.assertTeacherOwnsGroup(user.id, record.groupId);
    }

    return this.prisma.attendance.update({
      where: { id },
      data: {
        status: dto.status,
        editReason: dto.editReason,
        editedAt: new Date(),
      },
    });
  }

  async getSummary(query: SummaryQueryDto, user: { id: string; role: Role }) {
    if (!query.groupId) throw new ForbiddenException('groupId is required');

    if (user.role === Role.TEACHER) {
      await this.assertTeacherOwnsGroup(user.id, query.groupId);
    }

    const where: any = { groupId: query.groupId };
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: { student: { select: { id: true, fullName: true } } },
    });

    const map = new Map<
      string,
      {
        studentId: string;
        fullName: string;
        present: number;
        absent: number;
        late: number;
      }
    >();

    for (const r of records) {
      const key = r.studentId;
      if (!map.has(key)) {
        map.set(key, {
          studentId: r.studentId,
          fullName: r.student.fullName,
          present: 0,
          absent: 0,
          late: 0,
        });
      }
      const entry = map.get(key)!;
      if (r.status === AttendanceStatus.PRESENT) entry.present++;
      else if (r.status === AttendanceStatus.ABSENT) entry.absent++;
      else if (r.status === AttendanceStatus.LATE) entry.late++;
    }

    return Array.from(map.values()).map((s) => {
      const total = s.present + s.absent + s.late;
      return {
        ...s,
        totalLessons: total,
        percentage:
          total > 0 ? Math.round(((s.present + s.late) / total) * 100) : 0,
      };
    });
  }
}
