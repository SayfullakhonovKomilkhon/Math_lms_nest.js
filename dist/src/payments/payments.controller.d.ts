import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, RejectPaymentDto } from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
export declare class PaymentsController {
    private service;
    constructor(service: PaymentsService);
    create(dto: CreatePaymentDto, actorId: string): Promise<{
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
    findAll(query: QueryPaymentsDto): Promise<{
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
    findByStudent(studentId: string, user: {
        id: string;
        role: Role;
    }): Promise<{
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
    }[]>;
    uploadReceipt(file: Express.Multer.File, studentId: string, actorId: string): Promise<{
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
    confirm(id: string, actorId: string): Promise<{
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
    reject(id: string, dto: RejectPaymentDto, actorId: string): Promise<{
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
}
