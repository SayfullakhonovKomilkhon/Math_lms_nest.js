"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GamificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamificationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const achievements_config_1 = require("./achievements.config");
let GamificationService = GamificationService_1 = class GamificationService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(GamificationService_1.name);
    }
    async calculateMonthlyAchievements(month, year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
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
        const scored = students.map((s) => {
            const totalLessons = s.attendances.length;
            const present = s.attendances.filter((a) => a.status !== 'ABSENT').length;
            const attendanceRate = totalLessons > 0 ? present / totalLessons : 0;
            const gradeValues = s.grades.map((g) => Number(g.maxScore) > 0
                ? (Number(g.score) / Number(g.maxScore)) * 100
                : 0);
            const avgScore = gradeValues.length > 0
                ? gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length
                : 0;
            const score = attendanceRate * 0.4 * 100 + avgScore * 0.6;
            return { student: s, score, attendanceRate, avgScore };
        });
        scored.sort((a, b) => b.score - a.score);
        const results = [];
        for (let i = 0; i < Math.min(scored.length, 3); i++) {
            const { student } = scored[i];
            const place = (i + 1);
            const gender = student.gender === client_1.Gender.FEMALE ? 'FEMALE' : 'MALE';
            const titleData = (0, achievements_config_1.getTitleForStudent)(month, place, gender);
            if (!titleData)
                continue;
            const existing = await this.prisma.achievement.findUnique({
                where: {
                    studentId_type_month_year: {
                        studentId: student.id,
                        type: client_1.AchievementType.MONTHLY,
                        month,
                        year,
                    },
                },
            });
            const isNew = !existing;
            await this.prisma.$transaction(async (tx) => {
                await tx.achievement.upsert({
                    where: {
                        studentId_type_month_year: {
                            studentId: student.id,
                            type: client_1.AchievementType.MONTHLY,
                            month,
                            year,
                        },
                    },
                    create: {
                        studentId: student.id,
                        type: client_1.AchievementType.MONTHLY,
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
                    await tx.notification.create({
                        data: {
                            userId: student.userId,
                            type: client_1.NotificationType.ACHIEVEMENT,
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
                                type: client_1.NotificationType.ACHIEVEMENT,
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
    async checkSpecialAchievements(studentId, month, year) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, gender: true },
        });
        if (!student)
            return;
        await this.checkIronAttendance(studentId, month, year);
        await this.checkPerfectScore(studentId, month, year);
        await this.checkThreeMonthsStreak(studentId, month, year);
        await this.checkNoAbsencesYear(studentId, year);
    }
    async checkIronAttendance(studentId, month, year) {
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
            if (records.length === 0)
                break;
            const absent = records.filter((r) => r.status === 'ABSENT').length;
            if (absent > 0)
                break;
            streak++;
        }
        if (streak >= 3) {
            await this.upsertSpecial(studentId, 'iron_attendance', month, year);
        }
    }
    async checkPerfectScore(studentId, month, year) {
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
            if (grades.length === 0)
                break;
            const avg = grades.reduce((s, g) => s +
                (Number(g.maxScore) > 0
                    ? (Number(g.score) / Number(g.maxScore)) * 100
                    : 0), 0) / grades.length;
            if (avg < 95)
                break;
            streak++;
        }
        if (streak >= 2) {
            await this.upsertSpecial(studentId, 'perfect_score', month, year);
        }
    }
    async checkThreeMonthsStreak(studentId, month, year) {
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
                    type: client_1.AchievementType.MONTHLY,
                    month: m,
                    year: y,
                    place: { lte: 3 },
                },
            });
            if (!achievement)
                break;
            streak++;
        }
        if (streak >= 3) {
            await this.upsertSpecial(studentId, 'three_months_streak', month, year);
        }
    }
    async checkNoAbsencesYear(studentId, year) {
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59);
        const absences = await this.prisma.attendance.count({
            where: { studentId, status: 'ABSENT', date: { gte: start, lte: end } },
        });
        if (absences === 0) {
            await this.upsertSpecial(studentId, 'no_absences_year', undefined, year);
        }
    }
    async upsertSpecial(studentId, key, month, year) {
        const config = achievements_config_1.SPECIAL_ACHIEVEMENTS.find((s) => s.key === key);
        if (!config)
            return;
        const existing = await this.prisma.achievement.findUnique({
            where: {
                studentId_type_month_year: {
                    studentId,
                    type: client_1.AchievementType.SPECIAL,
                    month: month ?? 0,
                    year,
                },
            },
        });
        if (existing)
            return;
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { userId: true, fullName: true },
        });
        if (!student)
            return;
        await this.prisma.$transaction(async (tx) => {
            await tx.achievement.create({
                data: {
                    studentId,
                    type: client_1.AchievementType.SPECIAL,
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
                    type: client_1.NotificationType.ACHIEVEMENT,
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
                        type: client_1.NotificationType.ACHIEVEMENT,
                        message: `🏆 ${student.fullName} получил особое достижение: ${config.title} ${config.icon}`,
                        isRead: false,
                    },
                });
            }
        });
    }
    async getStudentAchievements(studentId) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: {
                id: true,
                fullName: true,
                gender: true,
                group: { select: { name: true } },
            },
        });
        if (!student)
            return null;
        const achievements = await this.prisma.achievement.findMany({
            where: { studentId },
            orderBy: { createdAt: 'asc' },
        });
        const monthly = achievements.filter((a) => a.type === client_1.AchievementType.MONTHLY);
        const specials = achievements.filter((a) => a.type === client_1.AchievementType.SPECIAL);
        const monthGrid = achievements_config_1.MONTHLY_ACHIEVEMENTS.map((mc) => {
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
        const specialAchievements = achievements_config_1.SPECIAL_ACHIEVEMENTS.map((sc) => {
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
                gender: student.gender,
                groupName: student.group?.name ?? null,
            },
            monthGrid,
            specialAchievements,
            stats: {
                goldCount,
                silverCount,
                bronzeCount,
                totalAchievements: monthly.length +
                    specials.filter((_, i) => specialAchievements[i]?.unlocked).length,
            },
        };
    }
    async getGroupAchievements(groupId) {
        const students = await this.prisma.student.findMany({
            where: { groupId, isActive: true },
            select: { id: true, fullName: true, gender: true },
        });
        const results = await Promise.all(students.map(async (s) => {
            const data = await this.getStudentAchievements(s.id);
            return data;
        }));
        return results.filter(Boolean);
    }
    async computeStudentProgress(studentId) {
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, fullName: true, gender: true },
        });
        if (!student)
            return null;
        const [attendances, grades, achievements] = await Promise.all([
            this.prisma.attendance.findMany({
                where: { studentId },
                select: { status: true, date: true },
                orderBy: { date: 'asc' },
            }),
            this.prisma.grade.findMany({
                where: { studentId },
                select: { score: true, maxScore: true, lessonType: true },
            }),
            this.prisma.achievement.findMany({
                where: { studentId },
                select: { type: true, place: true },
            }),
        ]);
        let attendanceXp = 0;
        let latenessXp = 0;
        let lessonGradesXp = 0;
        let examGradesXp = 0;
        let monthlyMedalsXp = 0;
        let specialAchievementsXp = 0;
        let streakBonusXp = 0;
        let totalLessons = 0;
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        for (const a of attendances) {
            totalLessons++;
            if (a.status === 'PRESENT') {
                attendanceXp += 25;
                presentCount++;
            }
            else if (a.status === 'LATE') {
                latenessXp += 10;
                lateCount++;
            }
            else if (a.status === 'ABSENT') {
                absentCount++;
            }
        }
        for (const g of grades) {
            const maxScore = Number(g.maxScore);
            const score = Number(g.score);
            if (maxScore <= 0)
                continue;
            const ratio = Math.max(0, Math.min(1, score / maxScore));
            if (g.lessonType === 'TEST') {
                examGradesXp += Math.round(ratio * 200);
            }
            else {
                lessonGradesXp += Math.round(ratio * 50);
            }
        }
        for (const a of achievements) {
            if (a.type === client_1.AchievementType.MONTHLY) {
                if (a.place === 1)
                    monthlyMedalsXp += 500;
                else if (a.place === 2)
                    monthlyMedalsXp += 300;
                else if (a.place === 3)
                    monthlyMedalsXp += 150;
            }
            else if (a.type === client_1.AchievementType.SPECIAL) {
                specialAchievementsXp += 400;
            }
        }
        let runningStreak = 0;
        let bestStreak = 0;
        for (const a of attendances) {
            if (a.status === 'PRESENT' || a.status === 'LATE') {
                runningStreak++;
                if (runningStreak > bestStreak)
                    bestStreak = runningStreak;
                if (runningStreak % 5 === 0)
                    streakBonusXp += 50;
            }
            else {
                runningStreak = 0;
            }
        }
        const currentStreak = runningStreak;
        const totalXp = attendanceXp +
            latenessXp +
            lessonGradesXp +
            examGradesXp +
            monthlyMedalsXp +
            specialAchievementsXp +
            streakBonusXp;
        let level = Math.floor((1 + Math.sqrt(1 + (8 * totalXp) / 500)) / 2);
        if (level < 1)
            level = 1;
        const xpToReachThis = (500 * level * (level - 1)) / 2;
        const xpForNextLevel = 500 * level;
        const xpInLevel = Math.max(0, totalXp - xpToReachThis);
        const titleData = computeProgressionTitle(level);
        return {
            student: {
                id: student.id,
                fullName: student.fullName,
                gender: student.gender,
            },
            totalXp,
            level,
            xpInLevel,
            xpForNextLevel,
            title: titleData.title,
            titleEmoji: titleData.emoji,
            streak: currentStreak,
            bestStreak,
            stats: {
                totalLessons,
                present: presentCount,
                late: lateCount,
                absent: absentCount,
                attendancePercent: totalLessons > 0
                    ? Math.round(((presentCount + lateCount) / totalLessons) * 100)
                    : 0,
            },
            breakdown: {
                attendance: attendanceXp,
                lateness: latenessXp,
                lessonGrades: lessonGradesXp,
                examGrades: examGradesXp,
                monthlyMedals: monthlyMedalsXp,
                specialAchievements: specialAchievementsXp,
                streakBonus: streakBonusXp,
            },
        };
    }
    async getCenterTopStudents(limit = 10) {
        const achievements = await this.prisma.achievement.groupBy({
            by: ['studentId'],
            where: { type: client_1.AchievementType.MONTHLY },
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
                    where: { type: client_1.AchievementType.MONTHLY },
                    select: { place: true },
                },
            },
        });
        return studentIds.map((sid, idx) => {
            const s = students.find((st) => st.id === sid);
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
};
exports.GamificationService = GamificationService;
exports.GamificationService = GamificationService = GamificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GamificationService);
function computeProgressionTitle(level) {
    if (level >= 20)
        return { title: 'Гений MathCenter', emoji: '👑' };
    if (level >= 15)
        return { title: 'Легенда', emoji: '🏆' };
    if (level >= 10)
        return { title: 'Стратег', emoji: '🎯' };
    if (level >= 5)
        return { title: 'Умный боец', emoji: '⚡' };
    return { title: 'Юный исследователь', emoji: '🌱' };
}
//# sourceMappingURL=gamification.service.js.map