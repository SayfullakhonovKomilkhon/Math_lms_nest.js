import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';
declare class CalculateDto {
    month: number;
    year: number;
}
export declare class GamificationController {
    private gamificationService;
    private prisma;
    constructor(gamificationService: GamificationService, prisma: PrismaService);
    getMy(req: any): Promise<{
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
    getStudentAchievements(id: string, req: any): Promise<{
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
    getMyProgress(req: any): Promise<{
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
    getStudentProgress(id: string, req: any): Promise<{
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
    getGroupAchievements(groupId: string, req: any): Promise<({
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
    getCenterTop(): Promise<{
        studentId: string;
        fullName: string;
        groupName: string;
        totalAchievements: number;
        goldCount: number;
    }[]>;
    calculate(dto: CalculateDto): Promise<{
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
}
export {};
