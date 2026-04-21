import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, RejectPaymentDto } from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
export declare class PaymentsController {
    private service;
    constructor(service: PaymentsService);
    create(dto: CreatePaymentDto, actorId: string): Promise<{
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
    findAll(query: QueryPaymentsDto): Promise<{
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
    }[]>;
    getDebtors(): Promise<{
        studentId: string;
        fullName: string;
        groupName: string;
        monthlyFee: import("@prisma/client/runtime/library").Decimal;
        lastPaymentDate: Date | null;
    }[]>;
    findMy(userId: string): Promise<{
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
    findByStudent(studentId: string, user: {
        id: string;
        role: Role;
    }): Promise<{
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
    }[]>;
    uploadReceipt(file: Express.Multer.File, studentId: string, actorId: string): Promise<{
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
    getReceiptUrl(id: string): Promise<{
        url: string;
    }>;
    confirm(id: string, actorId: string): Promise<{
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
    reject(id: string, dto: RejectPaymentDto, actorId: string): Promise<{
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
}
