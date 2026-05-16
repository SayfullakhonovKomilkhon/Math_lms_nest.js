import { Injectable } from '@nestjs/common';
import { AttendanceStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DateRangeQueryDto,
  RevenueQueryDto,
  StudentsGrowthQueryDto,
} from './dto/analytics-query.dto';

const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ─── OVERVIEW ───────────────────────────────────────────────────────────────

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      totalGroups,
      totalTeachers,
      newStudentsThisWeek,
      currentMonthPayments,
      lastMonthPayments,
      debtorsData,
      allActiveStudents,
      thisMonthAttendance,
    ] = await Promise.all([
      this.prisma.student.count({ where: { isActive: true } }),
      this.prisma.group.count({ where: { isActive: true } }),
      this.prisma.teacher.count({ where: { isActive: true } }),
      this.prisma.student.count({
        where: { enrolledAt: { gte: startOfWeek } },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.CONFIRMED,
          confirmedAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.CONFIRMED,
          confirmedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.CONFIRMED,
          confirmedAt: { gte: startOfMonth },
        },
        select: { studentId: true },
      }),
      // Sum of all StudentGroup link fees across active students gives us
      // the expected next-month gross. We can't run prisma.aggregate on a
      // joined table easily, so we sum after filtering to active students.
      this.prisma.studentGroup.findMany({
        where: { student: { isActive: true } },
        select: { monthlyFee: true },
      }),
      this.prisma.attendance.findMany({
        where: { date: { gte: startOfMonth } },
        select: { status: true },
      }),
    ]);

    const paidIds = new Set(debtorsData.map((p) => p.studentId));
    const debtorsCount = totalStudents - paidIds.size;

    const nextMonthForecast = allActiveStudents.reduce(
      (acc, link) => acc + Number(link.monthlyFee),
      0,
    );

    let present = 0;
    const total = thisMonthAttendance.length;
    for (const a of thisMonthAttendance) {
      if (
        a.status === AttendanceStatus.PRESENT ||
        a.status === AttendanceStatus.LATE
      )
        present++;
    }
    const centerAttendancePercent =
      total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      totalStudents,
      totalGroups,
      totalTeachers,
      newStudentsThisWeek,
      debtorsCount: Math.max(0, debtorsCount),
      currentMonthRevenue: Number(currentMonthPayments._sum.amount ?? 0),
      lastMonthRevenue: Number(lastMonthPayments._sum.amount ?? 0),
      nextMonthForecast: Math.round(nextMonthForecast),
      centerAttendancePercent,
    };
  }

  // ─── REVENUE ────────────────────────────────────────────────────────────────

  async getRevenue(query: RevenueQueryDto) {
    const year = query.year ?? new Date().getFullYear();

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.CONFIRMED,
        confirmedAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      select: { confirmedAt: true, amount: true, studentId: true },
    });

    const result = MONTH_NAMES.map((month, i) => {
      const monthPayments = payments.filter(
        (p) => p.confirmedAt && new Date(p.confirmedAt).getMonth() === i,
      );
      const revenue = monthPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const studentsCount = new Set(monthPayments.map((p) => p.studentId)).size;
      return { month, revenue, studentsCount };
    });

    return result;
  }

  // ─── STUDENTS GROWTH ────────────────────────────────────────────────────────

  async getStudentsGrowth(query: StudentsGrowthQueryDto) {
    const period = query.period ?? 'monthly';
    const from = query.from
      ? new Date(query.from)
      : new Date(new Date().getFullYear(), 0, 1);
    const to = query.to ? new Date(query.to) : new Date();

    const students = await this.prisma.student.findMany({
      where: { enrolledAt: { gte: from, lte: to } },
      select: { enrolledAt: true },
      orderBy: { enrolledAt: 'asc' },
    });

    const allStudents = await this.prisma.student.findMany({
      where: { enrolledAt: { lt: from } },
      select: { id: true },
    });
    let runningTotal = allStudents.length;

    if (period === 'monthly') {
      const map = new Map<string, number>();
      for (const s of students) {
        const key = `${s.enrolledAt.getFullYear()}-${String(s.enrolledAt.getMonth() + 1).padStart(2, '0')}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return Array.from(map.entries()).map(([date, newStudents]) => {
        runningTotal += newStudents;
        return { date, newStudents, totalStudents: runningTotal };
      });
    } else {
      // weekly
      const map = new Map<string, number>();
      for (const s of students) {
        const d = new Date(s.enrolledAt);
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const key = monday.toISOString().slice(0, 10);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return Array.from(map.entries()).map(([date, newStudents]) => {
        runningTotal += newStudents;
        return { date, newStudents, totalStudents: runningTotal };
      });
    }
  }

  // ─── ATTENDANCE CENTER ───────────────────────────────────────────────────────

  async getAttendanceCenter(query: DateRangeQueryDto) {
    const where: any = {};
    if (query.groupId) where.groupId = query.groupId;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            teacher: { select: { fullName: true } },
          },
        },
      },
    });

    // Overall
    let present = 0,
      absent = 0,
      late = 0;
    for (const r of records) {
      if (r.status === AttendanceStatus.PRESENT) present++;
      else if (r.status === AttendanceStatus.ABSENT) absent++;
      else if (r.status === AttendanceStatus.LATE) late++;
    }
    const total = present + absent + late;
    const overallPercent =
      total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    // By group
    const groupMap = new Map<
      string,
      {
        groupName: string;
        teacherName: string;
        p: number;
        a: number;
        l: number;
      }
    >();
    for (const r of records) {
      const key = r.groupId;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          groupName: r.group.name,
          teacherName: r.group.teacher.fullName,
          p: 0,
          a: 0,
          l: 0,
        });
      }
      const entry = groupMap.get(key)!;
      if (r.status === AttendanceStatus.PRESENT) entry.p++;
      else if (r.status === AttendanceStatus.ABSENT) entry.a++;
      else if (r.status === AttendanceStatus.LATE) entry.l++;
    }
    const byGroup = Array.from(groupMap.entries()).map(([groupId, v]) => {
      const t = v.p + v.a + v.l;
      return {
        groupId,
        groupName: v.groupName,
        teacherName: v.teacherName,
        totalLessons: t,
        percentage: t > 0 ? Math.round(((v.p + v.l) / t) * 100) : 0,
      };
    });

    // By month
    const monthMap = new Map<string, { p: number; total: number }>();
    for (const r of records) {
      const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) monthMap.set(key, { p: 0, total: 0 });
      const entry = monthMap.get(key)!;
      entry.total++;
      if (r.status !== AttendanceStatus.ABSENT) entry.p++;
    }
    const byMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        month: MONTH_NAMES[parseInt(key.split('-')[1]) - 1],
        percentage: v.total > 0 ? Math.round((v.p / v.total) * 100) : 0,
      }));

    return {
      overall: { present, absent, late, percentage: overallPercent },
      byGroup,
      byMonth,
    };
  }

  // ─── GRADES CENTER ───────────────────────────────────────────────────────────

  async getGradesCenter(query: DateRangeQueryDto) {
    const where: any = {};
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const grades = await this.prisma.grade.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
        group: {
          select: {
            id: true,
            name: true,
            teacher: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (grades.length === 0) {
      return {
        centerAverage: 0,
        byGroup: [],
        byTeacher: [],
        topStudents: [],
        byMonth: [],
      };
    }

    const toPercent = (score: number, max: number) =>
      max > 0 ? (score / max) * 100 : 0;

    // Center average
    const centerAverage =
      grades.reduce(
        (sum, g) => sum + toPercent(Number(g.score), Number(g.maxScore)),
        0,
      ) / grades.length;

    // By group
    const groupMap = new Map<
      string,
      {
        groupName: string;
        teacherName: string;
        scores: number[];
        studentIds: Set<string>;
      }
    >();
    for (const g of grades) {
      if (!groupMap.has(g.groupId)) {
        groupMap.set(g.groupId, {
          groupName: g.group.name,
          teacherName: g.group.teacher.fullName,
          scores: [],
          studentIds: new Set(),
        });
      }
      const entry = groupMap.get(g.groupId)!;
      entry.scores.push(toPercent(Number(g.score), Number(g.maxScore)));
      entry.studentIds.add(g.studentId);
    }
    const byGroup = Array.from(groupMap.entries()).map(([groupId, v]) => ({
      groupId,
      groupName: v.groupName,
      teacherName: v.teacherName,
      averageScore:
        Math.round(
          (v.scores.reduce((a, b) => a + b, 0) / v.scores.length) * 10,
        ) / 10,
      totalWorks: v.scores.length,
    }));

    // By teacher
    const teacherMap = new Map<
      string,
      {
        teacherName: string;
        groupIds: Set<string>;
        studentIds: Set<string>;
        scores: number[];
      }
    >();
    for (const g of grades) {
      const tid = g.group.teacher.id;
      if (!teacherMap.has(tid)) {
        teacherMap.set(tid, {
          teacherName: g.group.teacher.fullName,
          groupIds: new Set(),
          studentIds: new Set(),
          scores: [],
        });
      }
      const entry = teacherMap.get(tid)!;
      entry.groupIds.add(g.groupId);
      entry.studentIds.add(g.studentId);
      entry.scores.push(toPercent(Number(g.score), Number(g.maxScore)));
    }
    const byTeacher = Array.from(teacherMap.entries()).map(
      ([teacherId, v]) => ({
        teacherId,
        teacherName: v.teacherName,
        groupsCount: v.groupIds.size,
        studentsCount: v.studentIds.size,
        averageScore:
          Math.round(
            (v.scores.reduce((a, b) => a + b, 0) / v.scores.length) * 10,
          ) / 10,
      }),
    );

    // Top students
    const studentMap = new Map<
      string,
      { fullName: string; groupName: string; scores: number[] }
    >();
    for (const g of grades) {
      if (!studentMap.has(g.studentId)) {
        studentMap.set(g.studentId, {
          fullName: g.student.fullName,
          groupName: g.group.name,
          scores: [],
        });
      }
      studentMap
        .get(g.studentId)!
        .scores.push(toPercent(Number(g.score), Number(g.maxScore)));
    }
    const topStudents = Array.from(studentMap.entries())
      .map(([studentId, v]) => ({
        studentId,
        fullName: v.fullName,
        groupName: v.groupName,
        averageScore:
          Math.round(
            (v.scores.reduce((a, b) => a + b, 0) / v.scores.length) * 10,
          ) / 10,
        totalWorks: v.scores.length,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);

    // By month
    const monthMap = new Map<string, number[]>();
    for (const g of grades) {
      const key = `${g.date.getFullYear()}-${String(g.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(toPercent(Number(g.score), Number(g.maxScore)));
    }
    const byMonth = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, scores]) => ({
        month: MONTH_NAMES[parseInt(key.split('-')[1]) - 1],
        averageScore:
          Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10,
      }));

    return {
      centerAverage: Math.round(centerAverage * 10) / 10,
      byGroup,
      byTeacher,
      topStudents,
      byMonth,
    };
  }

  // ─── DEBTORS ─────────────────────────────────────────────────────────────────

  async getDebtors(params?: { month?: string; year?: string }) {
    const now = new Date();

    // Parse selected period. Accepts either `month=YYYY-MM` or separate
    // `month` (1-12) and `year` values. Falls back to current month.
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0-based
    if (params?.month) {
      const isoMatch = /^(\d{4})-(\d{1,2})$/.exec(params.month);
      if (isoMatch) {
        targetYear = Number(isoMatch[1]);
        targetMonth = Number(isoMatch[2]) - 1;
      } else {
        const m = Number(params.month);
        if (Number.isFinite(m) && m >= 1 && m <= 12) targetMonth = m - 1;
        if (params.year) {
          const y = Number(params.year);
          if (Number.isFinite(y)) targetYear = y;
        }
      }
    } else if (params?.year) {
      const y = Number(params.year);
      if (Number.isFinite(y)) targetYear = y;
    }

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 1);

    const [confirmedThisMonth, allActiveStudents] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.CONFIRMED,
          confirmedAt: { gte: startOfMonth, lt: endOfMonth },
        },
        select: { studentId: true },
      }),
      this.prisma.student.findMany({
        where: { isActive: true },
        select: {
          id: true,
          fullName: true,
          groups: {
            orderBy: { joinedAt: 'asc' },
            select: {
              monthlyFee: true,
              group: {
                select: {
                  name: true,
                  teacher: { select: { fullName: true } },
                },
              },
            },
          },
          parents: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { parent: { select: { phone: true } } },
          },
          payments: {
            where: {
              status: PaymentStatus.CONFIRMED,
              confirmedAt: { lt: endOfMonth },
            },
            orderBy: { confirmedAt: 'desc' },
            take: 1,
            select: { confirmedAt: true },
          },
        },
      }),
    ]);

    const paidIds = new Set(confirmedThisMonth.map((p) => p.studentId));
    // For a historical view, anchor "days since" to the end of the selected
    // month rather than today, so the value reflects the situation at the
    // time of that period. For the current month we keep using "now".
    const reference = endOfMonth.getTime() <= now.getTime() ? endOfMonth : now;

    return allActiveStudents
      .filter((s) => !paidIds.has(s.id))
      .map((s) => {
        const lastDate = s.payments[0]?.confirmedAt ?? null;
        const daysSince = lastDate
          ? Math.max(
              0,
              Math.floor(
                (reference.getTime() - lastDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : null;
        // Aggregate every group enrollment into the row the debtor table
        // expects: a single concatenated group label and the *summed* fee.
        const groups = s.groups.map((link) => ({
          name: link.group.name,
          teacherName: link.group.teacher.fullName,
          monthlyFee: Number(link.monthlyFee),
        }));
        const monthlyFee = groups.reduce((acc, g) => acc + g.monthlyFee, 0);
        const groupName =
          groups.length === 0
            ? '—'
            : groups.length === 1
              ? groups[0].name
              : groups.map((g) => g.name).join(', ');
        const teacherName =
          groups.length === 0
            ? '—'
            : Array.from(new Set(groups.map((g) => g.teacherName))).join(', ');
        return {
          studentId: s.id,
          fullName: s.fullName,
          groupName,
          teacherName,
          monthlyFee,
          lastPaymentDate: lastDate ? lastDate.toISOString() : null,
          daysSinceLastPayment: daysSince,
          parentPhone: s.parents?.[0]?.parent?.phone ?? null,
        };
      })
      .sort((a, b) => {
        if (a.daysSinceLastPayment === null) return 1;
        if (b.daysSinceLastPayment === null) return -1;
        return b.daysSinceLastPayment - a.daysSinceLastPayment;
      });
  }

  // ─── TEACHERS LOAD ───────────────────────────────────────────────────────────

  async getTeachersLoad() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const teachers = await this.prisma.teacher.findMany({
      where: { isActive: true },
      include: {
        groups: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                students: { where: { student: { isActive: true } } },
              },
            },
            attendances: {
              where: { date: { gte: startOfMonth } },
              select: { status: true },
            },
          },
        },
      },
    });

    return teachers
      .map((t) => {
        const studentsCount = t.groups.reduce(
          (sum, g) => sum + g._count.students,
          0,
        );
        const rate = Number(t.ratePerStudent);
        const totalSalary = studentsCount * rate;

        // attendance across all groups
        let present = 0,
          total = 0;
        for (const g of t.groups) {
          for (const a of g.attendances) {
            total++;
            if (a.status !== AttendanceStatus.ABSENT) present++;
          }
        }
        const attendancePercent =
          total > 0 ? Math.round((present / total) * 100) : 0;

        return {
          teacherId: t.id,
          fullName: t.fullName,
          phone: t.phone ?? null,
          groupsCount: t.groups.length,
          studentsCount,
          ratePerStudent: rate,
          totalSalary,
          attendancePercent,
        };
      })
      .sort((a, b) => b.studentsCount - a.studentsCount);
  }
}
