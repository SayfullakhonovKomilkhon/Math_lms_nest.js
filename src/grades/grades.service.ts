import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AttendanceStatus, Prisma, Role } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BulkGradesDto } from './dto/bulk-grades.dto';
import { EditGradeDto } from './dto/edit-grade.dto';
import { QueryGradesDto, RatingQueryDto } from './dto/query-grades.dto';

@Injectable()
export class GradesService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  private async getTeacherOrThrow(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new ForbiddenException('Teacher profile not found');
    return teacher;
  }

  private async assertTeacherOwnsGroup(userId: string, groupId: string) {
    const teacher = await this.getTeacherOrThrow(userId);
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Group not found');
    if (group.teacherId !== teacher.id)
      throw new ForbiddenException('You can only manage your own groups');
    return teacher;
  }

  async bulkCreate(dto: BulkGradesDto, user: { id: string; role: Role }) {
    if (user.role !== Role.TEACHER) {
      throw new ForbiddenException('Only teachers can bulk-create grades');
    }
    await this.assertTeacherOwnsGroup(user.id, dto.groupId);

    // Idempotent: per (student, group, date-day, lessonType) we keep at most one
    // grade. Re-submitting overwrites previous score; score=null deletes it
    // (e.g. when student is marked absent).
    const date = new Date(dto.date);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    let written = 0;
    const createdGradeIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const r of dto.records) {
        await tx.grade.deleteMany({
          where: {
            studentId: r.studentId,
            groupId: dto.groupId,
            lessonType: dto.lessonType,
            date: { gte: dayStart, lt: dayEnd },
          },
        });
        if (r.score == null) continue; // absent / cleared — skip create
        const created = await tx.grade.create({
          data: {
            studentId: r.studentId,
            groupId: dto.groupId,
            date,
            lessonType: dto.lessonType,
            score: r.score,
            maxScore: dto.maxScore,
            comment: r.comment,
            gradedAt: new Date(),
          },
          select: { id: true },
        });
        createdGradeIds.push(created.id);
        written += 1;
      }
    });

    // Fanout AFTER the transaction commits — otherwise queue worker may try
    // to read a grade that's still inside the open tx.
    for (const gradeId of createdGradeIds) {
      await this.notificationsQueue.add('send-grade-notification', {
        gradeId,
      });
    }

    return { created: written };
  }

  async findAll(query: QueryGradesDto, user: { id: string; role: Role }) {
    const where: Prisma.GradeWhereInput = {};

    if (user.role === Role.TEACHER) {
      const teacher = await this.getTeacherOrThrow(user.id);
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
    if (query.lessonType) where.lessonType = query.lessonType;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) (where.date as any).gte = new Date(query.from);
      if (query.to) (where.date as any).lte = new Date(query.to);
    }

    return this.prisma.grade.findMany({
      where,
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async update(
    id: string,
    dto: EditGradeDto,
    user: { id: string; role: Role },
  ) {
    if (user.role !== Role.TEACHER) {
      throw new ForbiddenException('Only teachers can edit grades');
    }

    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) throw new NotFoundException('Grade not found');

    await this.assertTeacherOwnsGroup(user.id, grade.groupId);

    const hoursDiff =
      (Date.now() - grade.gradedAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 24) {
      throw new ForbiddenException(
        'Grades can only be edited within 24 hours of grading',
      );
    }

    return this.prisma.grade.update({
      where: { id },
      data: { score: dto.score, comment: dto.comment },
    });
  }

  async getRating(
    groupId: string,
    query: RatingQueryDto,
    user: { id: string; role: Role },
  ) {
    if (user.role === Role.TEACHER) {
      await this.assertTeacherOwnsGroup(user.id, groupId);
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    const now = new Date();
    if (query.period === 'month') {
      dateFilter.gte = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (query.period === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      dateFilter.gte = new Date(now.getFullYear(), quarter * 3, 1);
    }

    const grades = await this.prisma.grade.findMany({
      where: {
        groupId,
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      include: { student: { select: { id: true, fullName: true } } },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: {
        groupId,
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
    });

    const studentMap = new Map<
      string,
      {
        studentId: string;
        fullName: string;
        totalScore: number;
        totalMax: number;
        count: number;
        presentDays: number;
        totalDays: number;
      }
    >();

    for (const g of grades) {
      const key = g.studentId;
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          studentId: g.studentId,
          fullName: g.student.fullName,
          totalScore: 0,
          totalMax: 0,
          count: 0,
          presentDays: 0,
          totalDays: 0,
        });
      }
      const entry = studentMap.get(key)!;
      entry.totalScore += Number(g.score);
      entry.totalMax += Number(g.maxScore);
      entry.count++;
    }

    for (const a of attendances) {
      if (!studentMap.has(a.studentId)) continue;
      const entry = studentMap.get(a.studentId)!;
      entry.totalDays++;
      if (
        a.status === AttendanceStatus.PRESENT ||
        a.status === AttendanceStatus.LATE
      )
        entry.presentDays++;
    }

    const sorted = Array.from(studentMap.values())
      .map((s) => ({
        studentId: s.studentId,
        fullName: s.fullName,
        // totalPoints — primary metric (raw points earned).
        totalPoints: Math.round(s.totalScore * 100) / 100,
        // totalMax — sum of `maxScore` across all graded works in the
        // selected period, so the client can render "X / Y" and rank
        // students fairly when exams have different ceilings.
        totalMax: Math.round(s.totalMax * 100) / 100,
        // averageScore — percentage = totalScore / totalMax * 100.
        averageScore:
          s.count > 0 && s.totalMax > 0
            ? Math.round((s.totalScore / s.totalMax) * 100 * 100) / 100
            : 0,
        totalWorks: s.count,
        attendancePercent:
          s.totalDays > 0 ? Math.round((s.presentDays / s.totalDays) * 100) : 0,
      }))
      // Sort by averageScore (fair across variable max scores), tiebreak
      // by raw totalPoints, then by name. This ensures a student who
      // scored 50/50 ranks above one who scored 60/100.
      .sort((a, b) => {
        if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.fullName.localeCompare(b.fullName);
      })
      .map((s, i) => ({ place: i + 1, ...s }));

    return sorted;
  }

  async getStudentAverage(
    studentId: string,
    query: { from?: string; to?: string; lessonType?: string },
    user: { id: string; role: Role; studentId?: string },
  ) {
    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
      });
      if (!student || student.id !== studentId)
        throw new ForbiddenException('You can only view your own grades');
    }

    if (user.role === Role.PARENT) {
      const link = await this.prisma.parentStudent.findFirst({
        where: { studentId, parent: { userId: user.id } },
        select: { parentId: true },
      });
      if (!link)
        throw new ForbiddenException("You can only view your child's grades");
    }

    const where: Prisma.GradeWhereInput = { studentId };
    if (query.lessonType) where.lessonType = query.lessonType as any;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) (where.date as any).gte = new Date(query.from);
      if (query.to) (where.date as any).lte = new Date(query.to);
    }

    const grades = await this.prisma.grade.findMany({ where });
    if (!grades.length) return { averageScore: 0, totalWorks: 0 };

    const totalScore = grades.reduce((s, g) => s + Number(g.score), 0);
    const totalMax = grades.reduce((s, g) => s + Number(g.maxScore), 0);

    return {
      averageScore: Math.round((totalScore / totalMax) * 100 * 100) / 100,
      totalWorks: grades.length,
    };
  }

  async findMy(
    query: { lessonType?: string; from?: string; to?: string },
    userId: string,
  ) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('Student profile not found');

    const where: Prisma.GradeWhereInput = { studentId: student.id };
    if (query.lessonType) where.lessonType = query.lessonType as any;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) (where.date as any).gte = new Date(query.from);
      if (query.to) (where.date as any).lte = new Date(query.to);
    }

    const grades = await this.prisma.grade.findMany({
      where,
      include: {
        group: { select: { name: true } },
      },
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

  async findMyStats(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException('Student profile not found');

    const grades = await this.prisma.grade.findMany({
      where: { studentId: student.id },
      orderBy: { date: 'asc' },
    });

    const stats = {
      averageScore: 0,
      totalWorks: grades.length,
      byMonth: [] as { month: string; averageScore: number }[],
      byType: [] as {
        lessonType: string;
        averageScore: number;
        count: number;
      }[],
    };

    if (grades.length === 0) return stats;

    let totalScore = 0;
    let totalMax = 0;
    const byMonthMap = new Map<string, { total: number; max: number }>();
    const byTypeMap = new Map<
      string,
      { total: number; max: number; count: number }
    >();

    for (const g of grades) {
      const gScore = Number(g.score);
      const gMax = Number(g.maxScore);

      totalScore += gScore;
      totalMax += gMax;

      // Group by month
      const monthKey = `${g.date.getFullYear()}-${String(g.date.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, { total: 0, max: 0 });
      }
      const m = byMonthMap.get(monthKey)!;
      m.total += gScore;
      m.max += gMax;

      // Group by type
      if (!byTypeMap.has(g.lessonType)) {
        byTypeMap.set(g.lessonType, { total: 0, max: 0, count: 0 });
      }
      const t = byTypeMap.get(g.lessonType)!;
      t.total += gScore;
      t.max += gMax;
      t.count++;
    }

    stats.averageScore =
      totalMax > 0 ? Math.round((totalScore / totalMax) * 100 * 100) / 100 : 0;

    stats.byMonth = Array.from(byMonthMap.entries()).map(([month, data]) => ({
      month,
      averageScore:
        data.max > 0
          ? Math.round((data.total / data.max) * 100 * 100) / 100
          : 0,
    }));

    stats.byType = Array.from(byTypeMap.entries()).map(
      ([lessonType, data]) => ({
        lessonType,
        count: data.count,
        averageScore:
          data.max > 0
            ? Math.round((data.total / data.max) * 100 * 100) / 100
            : 0,
      }),
    );

    return stats;
  }

  async findMyRating(
    query: { period?: 'month' | 'quarter' | 'all' },
    userId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    // The student panel renders a single podium per visit, so we pick the
    // primary (= first joined) group when the student is in several. The
    // UI can pass an explicit group id later if we expose multi-group
    // ratings — for now this matches the previous "one rating" behavior.
    const link = await this.prisma.studentGroup.findFirst({
      where: { studentId: student.id },
      orderBy: { joinedAt: 'asc' },
      select: { groupId: true },
    });
    if (!link) {
      return {
        myPlace: 0,
        totalStudents: 0,
        myAverageScore: 0,
        isVisible: false,
        rating: [],
      };
    }

    const group = await this.prisma.group.findUnique({
      where: { id: link.groupId },
    });
    if (!group) {
      return {
        myPlace: 0,
        totalStudents: 0,
        myAverageScore: 0,
        isVisible: false,
        rating: [],
      };
    }

    const ratingList = await this.getRating(
      link.groupId,
      { period: query.period as any },
      { id: userId, role: Role.STUDENT },
    );

    const myEntry = ratingList.find((r) => r.studentId === student.id);

    return {
      myPlace: myEntry ? myEntry.place : 0,
      totalStudents: ratingList.length,
      myAverageScore: myEntry ? myEntry.averageScore : 0,
      myTotalPoints: myEntry ? myEntry.totalPoints : 0,
      myTotalMax: myEntry ? myEntry.totalMax : 0,
      isVisible: group.isRatingVisible,
      rating: group.isRatingVisible ? ratingList : [],
    };
  }
}
