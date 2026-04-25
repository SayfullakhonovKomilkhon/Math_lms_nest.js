import { Injectable, Logger } from '@nestjs/common';
import { AchievementType, Gender, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MONTHLY_ACHIEVEMENTS,
  SPECIAL_ACHIEVEMENTS,
  getTitleForStudent,
} from './achievements.config';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private prisma: PrismaService) {}

  async calculateMonthlyAchievements(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all active students with attendance and grades for this month
    const students = await this.prisma.student.findMany({
      where: { isActive: true },
      include: {
        user: { select: { id: true } },
        attendances: {
          where: { date: { gte: startDate, lte: endDate } },
          select: { status: true },
        },
        grades: {
          where: { date: { gte: startDate, lte: endDate } },
          select: { score: true, maxScore: true },
        },
      },
    });

    // Score each student
    const scored = students.map((s) => {
      const totalLessons = s.attendances.length;
      const present = s.attendances.filter((a) => a.status !== 'ABSENT').length;
      const attendanceRate = totalLessons > 0 ? present / totalLessons : 0;

      const gradeValues = s.grades.map((g) =>
        Number(g.maxScore) > 0
          ? (Number(g.score) / Number(g.maxScore)) * 100
          : 0,
      );
      const avgScore =
        gradeValues.length > 0
          ? gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length
          : 0;

      const score = attendanceRate * 0.4 * 100 + avgScore * 0.6;

      return { student: s, score, attendanceRate, avgScore };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const results: Array<{
      studentId: string;
      place: number;
      title: string;
      icon: string;
    }> = [];

    for (let i = 0; i < Math.min(scored.length, 3); i++) {
      const { student } = scored[i];
      const place = (i + 1) as 1 | 2 | 3;
      const gender: 'MALE' | 'FEMALE' =
        student.gender === Gender.FEMALE ? 'FEMALE' : 'MALE';

      const titleData = getTitleForStudent(month, place, gender);
      if (!titleData) continue;

      // Check if already awarded to avoid duplicate notifications
      const existing = await this.prisma.achievement.findUnique({
        where: {
          studentId_type_month_year: {
            studentId: student.id,
            type: AchievementType.MONTHLY,
            month,
            year,
          },
        },
      });

      const isNew = !existing;

      // Achievement + Notification in one transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.achievement.upsert({
          where: {
            studentId_type_month_year: {
              studentId: student.id,
              type: AchievementType.MONTHLY,
              month,
              year,
            },
          },
          create: {
            studentId: student.id,
            type: AchievementType.MONTHLY,
            month,
            year,
            place,
            title: titleData.title,
            icon: titleData.icon,
            description: titleData.description,
          },
          update: {
            place,
            title: titleData.title,
            icon: titleData.icon,
            description: titleData.description,
          },
        });

        if (isNew) {
          // Notify student
          await tx.notification.create({
            data: {
              userId: student.userId,
              type: NotificationType.ACHIEVEMENT,
              message: `🏆 Новое достижение: ${titleData.title} ${titleData.icon}`,
              isRead: false,
            },
          });

          const parentLinks = await tx.parentStudent.findMany({
            where: { studentId: student.id },
            select: { parent: { select: { userId: true } } },
          });
          for (const link of parentLinks) {
            await tx.notification.create({
              data: {
                userId: link.parent.userId,
                type: NotificationType.ACHIEVEMENT,
                message: `🏆 ${student.fullName} получил новое достижение: ${titleData.title} ${titleData.icon}`,
                isRead: false,
              },
            });
          }
        }
      });

      results.push({
        studentId: student.id,
        place,
        title: titleData.title,
        icon: titleData.icon,
      });
    }

    return { month, year, awarded: results.length, results };
  }

  async checkSpecialAchievements(
    studentId: string,
    month: number,
    year: number,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, gender: true },
    });
    if (!student) return;

    // iron_attendance: 100% attendance 3 months in a row
    await this.checkIronAttendance(studentId, month, year);

    // perfect_score: avg >= 95 for 2 months in a row
    await this.checkPerfectScore(studentId, month, year);

    // three_months_streak: top 3 for 3 months in a row
    await this.checkThreeMonthsStreak(studentId, month, year);

    // no_absences_year: 0 absences in the current year
    await this.checkNoAbsencesYear(studentId, year);
  }

  private async checkIronAttendance(
    studentId: string,
    month: number,
    year: number,
  ) {
    let streak = 0;
    for (let i = 0; i < 3; i++) {
      let m = month - i;
      let y = year;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }

      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      const records = await this.prisma.attendance.findMany({
        where: { studentId, date: { gte: start, lte: end } },
        select: { status: true },
      });
      if (records.length === 0) break;
      const absent = records.filter((r) => r.status === 'ABSENT').length;
      if (absent > 0) break;
      streak++;
    }

    if (streak >= 3) {
      await this.upsertSpecial(studentId, 'iron_attendance', month, year);
    }
  }

  private async checkPerfectScore(
    studentId: string,
    month: number,
    year: number,
  ) {
    let streak = 0;
    for (let i = 0; i < 2; i++) {
      let m = month - i;
      let y = year;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }

      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      const grades = await this.prisma.grade.findMany({
        where: { studentId, date: { gte: start, lte: end } },
        select: { score: true, maxScore: true },
      });
      if (grades.length === 0) break;
      const avg =
        grades.reduce(
          (s, g) =>
            s +
            (Number(g.maxScore) > 0
              ? (Number(g.score) / Number(g.maxScore)) * 100
              : 0),
          0,
        ) / grades.length;
      if (avg < 95) break;
      streak++;
    }

    if (streak >= 2) {
      await this.upsertSpecial(studentId, 'perfect_score', month, year);
    }
  }

  private async checkThreeMonthsStreak(
    studentId: string,
    month: number,
    year: number,
  ) {
    let streak = 0;
    for (let i = 0; i < 3; i++) {
      let m = month - i;
      let y = year;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }

      const achievement = await this.prisma.achievement.findFirst({
        where: {
          studentId,
          type: AchievementType.MONTHLY,
          month: m,
          year: y,
          place: { lte: 3 },
        },
      });
      if (!achievement) break;
      streak++;
    }

    if (streak >= 3) {
      await this.upsertSpecial(studentId, 'three_months_streak', month, year);
    }
  }

  private async checkNoAbsencesYear(studentId: string, year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);
    const absences = await this.prisma.attendance.count({
      where: { studentId, status: 'ABSENT', date: { gte: start, lte: end } },
    });

    if (absences === 0) {
      await this.upsertSpecial(studentId, 'no_absences_year', undefined, year);
    }
  }

  private async upsertSpecial(
    studentId: string,
    key: string,
    month: number | undefined,
    year: number,
  ) {
    const config = SPECIAL_ACHIEVEMENTS.find((s) => s.key === key);
    if (!config) return;

    // Rule 8: check if already unlocked — don't duplicate
    const existing = await this.prisma.achievement.findUnique({
      where: {
        studentId_type_month_year: {
          studentId,
          type: AchievementType.SPECIAL,
          month: month ?? 0,
          year,
        },
      },
    });
    if (existing) return;

    // Get student userId for notification
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true, fullName: true },
    });
    if (!student) return;

    // Achievement + Notification in one transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.achievement.create({
        data: {
          studentId,
          type: AchievementType.SPECIAL,
          month: month ?? 0,
          year,
          title: config.title,
          icon: config.icon,
          description: config.description,
        },
      });

      await tx.notification.create({
        data: {
          userId: student.userId,
          type: NotificationType.ACHIEVEMENT,
          message: `🏆 Особое достижение: ${config.title} ${config.icon}`,
          isRead: false,
        },
      });

      const parentLinks = await tx.parentStudent.findMany({
        where: { studentId },
        select: { parent: { select: { userId: true } } },
      });
      for (const link of parentLinks) {
        await tx.notification.create({
          data: {
            userId: link.parent.userId,
            type: NotificationType.ACHIEVEMENT,
            message: `🏆 ${student.fullName} получил особое достижение: ${config.title} ${config.icon}`,
            isRead: false,
          },
        });
      }
    });
  }

  async getStudentAchievements(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        gender: true,
        group: { select: { name: true } },
      },
    });
    if (!student) return null;

    const achievements = await this.prisma.achievement.findMany({
      where: { studentId },
      orderBy: { createdAt: 'asc' },
    });

    const monthly = achievements.filter(
      (a) => a.type === AchievementType.MONTHLY,
    );
    const specials = achievements.filter(
      (a) => a.type === AchievementType.SPECIAL,
    );

    const monthGrid = MONTHLY_ACHIEVEMENTS.map((mc) => {
      const found = monthly.find((a) => a.month === mc.month);
      if (!found)
        return { month: mc.month, monthName: mc.monthName, unlocked: false };
      return {
        month: mc.month,
        monthName: mc.monthName,
        unlocked: true,
        place: found.place,
        title: found.title,
        icon: found.icon,
        description: found.description,
        year: found.year,
        createdAt: found.createdAt,
      };
    });

    const specialAchievements = SPECIAL_ACHIEVEMENTS.map((sc) => {
      const found = specials.find((a) => a.title === sc.title);
      return {
        key: sc.key,
        title: sc.title,
        icon: sc.icon,
        description: sc.description,
        condition: sc.condition,
        unlocked: !!found,
        unlockedAt: found?.createdAt,
      };
    });

    const goldCount = monthly.filter((a) => a.place === 1).length;
    const silverCount = monthly.filter((a) => a.place === 2).length;
    const bronzeCount = monthly.filter((a) => a.place === 3).length;

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        groupName: student.group?.name ?? null,
      },
      monthGrid,
      specialAchievements,
      stats: {
        goldCount,
        silverCount,
        bronzeCount,
        totalAchievements:
          monthly.length +
          specials.filter((_, i) => specialAchievements[i]?.unlocked).length,
      },
    };
  }

  async getGroupAchievements(groupId: string) {
    const students = await this.prisma.student.findMany({
      where: { groupId, isActive: true },
      select: { id: true, fullName: true, gender: true },
    });

    const results = await Promise.all(
      students.map(async (s) => {
        const data = await this.getStudentAchievements(s.id);
        return data;
      }),
    );

    return results.filter(Boolean);
  }

  async getCenterTopStudents(limit = 10) {
    const achievements = await this.prisma.achievement.groupBy({
      by: ['studentId'],
      where: { type: AchievementType.MONTHLY },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const studentIds = achievements.map((a) => a.studentId);
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        fullName: true,
        gender: true,
        group: { select: { name: true } },
        achievements: {
          where: { type: AchievementType.MONTHLY },
          select: { place: true },
        },
      },
    });

    return studentIds.map((sid, idx) => {
      const s = students.find((st) => st.id === sid)!;
      const count = achievements[idx]._count.id;
      const gold = s?.achievements.filter((a) => a.place === 1).length ?? 0;
      return {
        studentId: sid,
        fullName: s?.fullName ?? '',
        groupName: s?.group?.name ?? '',
        totalAchievements: count,
        goldCount: gold,
      };
    });
  }
}
