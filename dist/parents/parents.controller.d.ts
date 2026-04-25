import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { UpdateParentCredentialsDto } from './dto/update-credentials.dto';
export declare class ParentsController {
    private parentsService;
    constructor(parentsService: ParentsService);
    findAll(search?: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        students: {
            student: {
                group: {
                    id: string;
                    name: string;
                } | null;
                id: string;
                isActive: boolean;
                fullName: string;
            };
        }[];
    }[]>;
    create(dto: CreateParentDto, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        students: {
            student: {
                group: {
                    id: string;
                    name: string;
                } | null;
                id: string;
                isActive: boolean;
                fullName: string;
            };
            createdAt: Date;
        }[];
    }>;
    getMyProfile(userId: string): Promise<{
        id: string;
        fullName: string;
        phone: string | null;
        email: string;
        children: {
            group: {
                teacher: {
                    fullName: string;
                    phone: string | null;
                };
                id: string;
                name: string;
                schedule: import("@prisma/client/runtime/library").JsonValue;
            } | null;
            id: string;
            isActive: boolean;
            fullName: string;
            gender: import(".prisma/client").$Enums.Gender;
            monthlyFee: import("@prisma/client/runtime/library").Decimal;
            enrolledAt: Date;
        }[];
    }>;
    getChildAttendance(query: {
        from?: string;
        to?: string;
        studentId?: string;
    }, userId: string): Promise<({
        group: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        groupId: string;
        date: Date;
        studentId: string;
        lessonType: import(".prisma/client").$Enums.LessonType;
        status: import(".prisma/client").$Enums.AttendanceStatus;
        editedAt: Date | null;
        editReason: string | null;
    })[]>;
    getChildGrades(query: {
        from?: string;
        to?: string;
        lessonType?: string;
        studentId?: string;
    }, userId: string): Promise<{
        scorePercent: number;
        groupName: string;
        group: {
            name: string;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        groupId: string;
        date: Date;
        studentId: string;
        lessonType: import(".prisma/client").$Enums.LessonType;
        score: import("@prisma/client/runtime/library").Decimal;
        comment: string | null;
        maxScore: import("@prisma/client/runtime/library").Decimal;
        gradedAt: Date;
    }[]>;
    getChildHomework(query: {
        studentId?: string;
    }, userId: string): Promise<({
        teacher: {
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        teacherId: string;
        groupId: string;
        text: string;
        imageUrls: string[];
        youtubeUrl: string | null;
        dueDate: Date | null;
    })[]>;
    getChildPayments(query: {
        studentId?: string;
    }, userId: string): Promise<{
        currentMonth: {
            status: string;
            amount: number;
            nextPaymentDate: Date | null;
            daysUntilPayment: number | null;
        };
        history: {
            student: {
                group: {
                    id: string;
                    name: string;
                } | null;
                id: string;
                fullName: string;
                monthlyFee: import("@prisma/client/runtime/library").Decimal;
            };
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: import("@prisma/client/runtime/library").Decimal;
            receiptUrl: string | null;
            nextPaymentDate: Date | null;
            confirmedAt: Date | null;
            rejectedAt: Date | null;
            rejectReason: string | null;
        }[];
    }>;
    getChildRating(query: {
        period?: 'month' | 'quarter' | 'all';
        studentId?: string;
    }, userId: string): Promise<{
        myPlace: number;
        totalStudents: number;
        myAverageScore: number;
        myTotalPoints: number;
        isVisible: boolean;
        rating: {
            studentId: string;
            fullName: string;
            totalPoints: number;
            averageScore: number;
            totalWorks: number;
            attendancePercent: number;
            place: number;
        }[];
    }>;
    uploadChildReceipt(file: Express.Multer.File, studentId: string | undefined, userId: string): Promise<{
        student: {
            group: {
                id: string;
                name: string;
            } | null;
            id: string;
            fullName: string;
            monthlyFee: import("@prisma/client/runtime/library").Decimal;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: import("@prisma/client/runtime/library").Decimal;
        receiptUrl: string | null;
        nextPaymentDate: Date | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
        rejectReason: string | null;
    }>;
    findOne(id: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        students: {
            student: {
                group: {
                    id: string;
                    name: string;
                } | null;
                id: string;
                isActive: boolean;
                fullName: string;
            };
            createdAt: Date;
        }[];
    }>;
    update(id: string, dto: UpdateParentDto, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        students: {
            student: {
                group: {
                    id: string;
                    name: string;
                } | null;
                id: string;
                isActive: boolean;
                fullName: string;
            };
            createdAt: Date;
        }[];
    }>;
    updateCredentials(id: string, dto: UpdateParentCredentialsDto, actorId: string): Promise<{
        ok: boolean;
        emailChanged?: undefined;
    } | {
        ok: boolean;
        emailChanged: boolean;
    }>;
    linkStudent(id: string, studentId: string, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        students: {
            student: {
                group: {
                    id: string;
                    name: string;
                } | null;
                id: string;
                isActive: boolean;
                fullName: string;
            };
            createdAt: Date;
        }[];
    }>;
    unlinkStudent(id: string, studentId: string, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
        students: {
            student: {
                group: {
                    id: string;
                    name: string;
                } | null;
                id: string;
                isActive: boolean;
                fullName: string;
            };
            createdAt: Date;
        }[];
    }>;
}
