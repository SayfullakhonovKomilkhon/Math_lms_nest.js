import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
export declare class ParentsController {
    private parentsService;
    constructor(parentsService: ParentsService);
    create(dto: CreateParentDto, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
    }>;
    getMyProfile(userId: string): Promise<{
        student: {
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
            fullName: string;
            gender: import(".prisma/client").$Enums.Gender;
            enrolledAt: Date;
        };
        id: string;
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
    uploadChildReceipt(file: Express.Multer.File, userId: string): Promise<{
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
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
    }>;
    update(id: string, dto: UpdateParentDto, actorId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        phone: string | null;
    }>;
}
