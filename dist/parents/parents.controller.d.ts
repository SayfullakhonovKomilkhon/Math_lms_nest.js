import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { UpdateParentCredentialsDto } from './dto/update-credentials.dto';
export declare class ParentsController {
    private parentsService;
    constructor(parentsService: ParentsService);
    findAll(search?: string): Promise<{
        students: {
            student: {
                id: string;
                fullName: string;
                isActive: boolean;
                group: {
                    id: string;
                    name: string;
                };
            };
        }[];
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
    }[]>;
    create(dto: CreateParentDto, actorId: string): Promise<{
        students: {
            createdAt: Date;
            student: {
                id: string;
                fullName: string;
                isActive: boolean;
                group: {
                    id: string;
                    name: string;
                };
            };
        }[];
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
    }>;
    getMyProfile(userId: string): Promise<{
        id: string;
        fullName: string;
        phone: string;
        children: (Omit<{
            id: string;
            isActive: boolean;
            fullName: string;
            groups: {
                group: {
                    teacher: {
                        phone: string | null;
                        fullName: string;
                    };
                    id: string;
                    name: string;
                    schedule: import("@prisma/client/runtime/library").JsonValue;
                };
                monthlyFee: import("@prisma/client/runtime/library").Decimal;
                joinedAt: Date;
            }[];
            gender: import(".prisma/client").$Enums.Gender;
            enrolledAt: Date;
        }, "groups"> & {
            monthlyFee: number;
            group: {
                id: string;
                name: string;
                schedule: unknown;
                teacher: {
                    fullName: string;
                    phone: string | null;
                };
            } | null;
            groups: {
                id: string;
                name: string;
                schedule: unknown;
                teacher: {
                    fullName: string;
                    phone: string | null;
                };
                monthlyFee: number;
                joinedAt: Date;
            }[];
        })[];
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
        studentId: string;
        date: Date;
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
        studentId: string;
        date: Date;
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
            id: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            status: import(".prisma/client").$Enums.PaymentStatus;
            receiptUrl: string | null;
            nextPaymentDate: Date | null;
            confirmedAt: Date | null;
            rejectedAt: Date | null;
            rejectReason: string | null;
            createdAt: Date;
            updatedAt: Date;
            student: {
                id: string;
                fullName: string;
                monthlyFee: number;
                group: {
                    id: string;
                    name: string;
                } | null;
                groups: {
                    id: string;
                    name: string;
                    monthlyFee: number;
                }[];
            };
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
            totalMax: number;
            averageScore: number;
            totalWorks: number;
            attendancePercent: number;
            place: number;
        }[];
    }>;
    uploadChildReceipt(file: Express.Multer.File, studentId: string | undefined, userId: string): Promise<{
        id: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.PaymentStatus;
        receiptUrl: string | null;
        nextPaymentDate: Date | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
        rejectReason: string | null;
        createdAt: Date;
        updatedAt: Date;
        student: {
            id: string;
            fullName: string;
            monthlyFee: number;
            group: {
                id: string;
                name: string;
            } | null;
            groups: {
                id: string;
                name: string;
                monthlyFee: number;
            }[];
        };
    }>;
    findOne(id: string): Promise<{
        students: {
            createdAt: Date;
            student: {
                id: string;
                fullName: string;
                isActive: boolean;
                group: {
                    id: string;
                    name: string;
                };
            };
        }[];
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
    }>;
    update(id: string, dto: UpdateParentDto, actorId: string): Promise<{
        students: {
            createdAt: Date;
            student: {
                id: string;
                fullName: string;
                isActive: boolean;
                group: {
                    id: string;
                    name: string;
                };
            };
        }[];
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
    }>;
    updateCredentials(id: string, dto: UpdateParentCredentialsDto, actorId: string): Promise<{
        ok: boolean;
        phoneChanged?: undefined;
    } | {
        ok: boolean;
        phoneChanged: boolean;
    }>;
    linkStudent(id: string, studentId: string, actorId: string): Promise<{
        students: {
            createdAt: Date;
            student: {
                id: string;
                fullName: string;
                isActive: boolean;
                group: {
                    id: string;
                    name: string;
                };
            };
        }[];
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
    }>;
    unlinkStudent(id: string, studentId: string, actorId: string): Promise<{
        students: {
            createdAt: Date;
            student: {
                id: string;
                fullName: string;
                isActive: boolean;
                group: {
                    id: string;
                    name: string;
                };
            };
        }[];
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
    }>;
}
