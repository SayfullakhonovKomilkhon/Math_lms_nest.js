import { PrismaService } from '../prisma/prisma.service';
export declare class GamificationService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    calculateMonthlyAchievements(month: number, year: number): Promise<{
        month: number;
        year: number;
        awarded: number;
        results: {
            studentId: string;
            place: number;
            title: string;
            icon: string;
        }[];
    }>;
    checkSpecialAchievements(studentId: string, month: number, year: number): Promise<void>;
    private checkIronAttendance;
    private checkPerfectScore;
    private checkThreeMonthsStreak;
    private checkNoAbsencesYear;
    private upsertSpecial;
    getStudentAchievements(studentId: string): Promise<{
        student: {
            id: string;
            fullName: string;
            gender: import(".prisma/client").$Enums.Gender;
            groupName: string | null;
        };
        monthGrid: ({
            month: number;
            monthName: string;
            unlocked: boolean;
            place?: undefined;
            title?: undefined;
            icon?: undefined;
            description?: undefined;
            year?: undefined;
            createdAt?: undefined;
        } | {
            month: number;
            monthName: string;
            unlocked: boolean;
            place: number | null;
            title: string;
            icon: string;
            description: string;
            year: number | null;
            createdAt: Date;
        })[];
        specialAchievements: {
            key: string;
            title: string;
            icon: string;
            description: string;
            condition: string;
            unlocked: boolean;
            unlockedAt: Date | undefined;
        }[];
        stats: {
            goldCount: number;
            silverCount: number;
            bronzeCount: number;
            totalAchievements: number;
        };
    } | null>;
    getGroupAchievements(groupId: string): Promise<({
        student: {
            id: string;
            fullName: string;
            gender: import(".prisma/client").$Enums.Gender;
            groupName: string | null;
        };
        monthGrid: ({
            month: number;
            monthName: string;
            unlocked: boolean;
            place?: undefined;
            title?: undefined;
            icon?: undefined;
            description?: undefined;
            year?: undefined;
            createdAt?: undefined;
        } | {
            month: number;
            monthName: string;
            unlocked: boolean;
            place: number | null;
            title: string;
            icon: string;
            description: string;
            year: number | null;
            createdAt: Date;
        })[];
        specialAchievements: {
            key: string;
            title: string;
            icon: string;
            description: string;
            condition: string;
            unlocked: boolean;
            unlockedAt: Date | undefined;
        }[];
        stats: {
            goldCount: number;
            silverCount: number;
            bronzeCount: number;
            totalAchievements: number;
        };
    } | null)[]>;
    computeStudentProgress(studentId: string): Promise<{
        student: {
            id: string;
            fullName: string;
            gender: import(".prisma/client").$Enums.Gender;
        };
        totalXp: number;
        level: number;
        xpInLevel: number;
        xpForNextLevel: number;
        title: string;
        titleEmoji: string;
        streak: number;
        bestStreak: number;
        stats: {
            totalLessons: number;
            present: number;
            late: number;
            absent: number;
            attendancePercent: number;
        };
        breakdown: {
            attendance: number;
            lateness: number;
            lessonGrades: number;
            examGrades: number;
            monthlyMedals: number;
            specialAchievements: number;
            streakBonus: number;
        };
    } | null>;
    getCenterTopStudents(limit?: number): Promise<{
        studentId: string;
        fullName: string;
        groupName: string;
        totalAchievements: number;
        goldCount: number;
    }[]>;
}
