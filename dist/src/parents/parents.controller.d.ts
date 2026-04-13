import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
export declare class ParentsController {
    private parentsService;
    constructor(parentsService: ParentsService);
    create(dto: CreateParentDto, actorId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
    }>;
    getMyProfile(userId: string): Promise<{
        id: string;
        student: {
            id: string;
            fullName: string;
            group: {
                id: string;
                teacher: {
                    fullName: string;
                    phone: string | null;
                };
                name: string;
                schedule: import("@prisma/client/runtime/library").JsonValue;
            } | null;
            gender: import(".prisma/client").$Enums.Gender;
            enrolledAt: Date;
        };
        fullName: string;
        phone: string | null;
    }>;
    getChildAttendance(query: {
        from?: string;
        to?: string;
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
        maxScore: import("@prisma/client/runtime/library").Decimal;
        comment: string | null;
        gradedAt: Date;
    }[]>;
    getChildHomework(userId: string): Promise<({
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
    getChildPayments(userId: string): Promise<{
        currentMonth: {
            status: string;
            amount: number;
            nextPaymentDate: Date | null;
            daysUntilPayment: number | null;
        };
        history: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            student: {
                id: string;
                fullName: string;
                group: {
                    id: string;
                    name: string;
                } | null;
                monthlyFee: import("@prisma/client/runtime/library").Decimal;
            };
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: import("@prisma/client/runtime/library").Decimal;
            nextPaymentDate: Date | null;
            rejectReason: string | null;
            receiptUrl: string | null;
            confirmedAt: Date | null;
            rejectedAt: Date | null;
        }[];
    }>;
    uploadChildReceipt(file: Express.Multer.File, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            id: string;
            fullName: string;
            group: {
                id: string;
                name: string;
            } | null;
            monthlyFee: import("@prisma/client/runtime/library").Decimal;
        };
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: import("@prisma/client/runtime/library").Decimal;
        nextPaymentDate: Date | null;
        rejectReason: string | null;
        receiptUrl: string | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
    }>;
    update(id: string, dto: UpdateParentDto, actorId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
    }>;
}
