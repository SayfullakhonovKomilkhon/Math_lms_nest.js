import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreateManualPaymentDto, CreatePaymentDto, RejectPaymentDto } from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
export declare class PaymentsController {
    private service;
    constructor(service: PaymentsService);
    create(dto: CreatePaymentDto, actorId: string): Promise<{
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
    findAll(query: QueryPaymentsDto): Promise<{
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
    }[]>;
    getDebtors(): Promise<{
        studentId: string;
        fullName: string;
        groupName: string;
        monthlyFee: number;
        groups: {
            id: string;
            name: string;
            monthlyFee: number;
        }[];
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
    findByStudent(studentId: string, user: {
        id: string;
        role: Role;
    }): Promise<{
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
    }[]>;
    createManual(file: Express.Multer.File | undefined, dto: CreateManualPaymentDto, actorId: string): Promise<{
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
    uploadReceipt(file: Express.Multer.File, studentId: string, actorId: string): Promise<{
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
    getReceiptUrl(id: string): Promise<{
        url: string;
    }>;
    confirm(id: string, actorId: string): Promise<{
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
    reject(id: string, dto: RejectPaymentDto, actorId: string): Promise<{
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
}
