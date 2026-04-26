import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { CreateManualPaymentDto, CreatePaymentDto, RejectPaymentDto } from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
export declare class PaymentsService {
    private prisma;
    private s3;
    constructor(prisma: PrismaService, s3: S3Service);
    create(dto: CreatePaymentDto, actorId: string): Promise<{
        id: string;
        amount: Prisma.Decimal;
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
    createManual(dto: CreateManualPaymentDto, file: Express.Multer.File | undefined, actorId: string): Promise<{
        id: string;
        amount: Prisma.Decimal;
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
        amount: Prisma.Decimal;
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
    findByStudent(studentId: string, user: {
        id: string;
        role: Role;
    }): Promise<{
        id: string;
        amount: Prisma.Decimal;
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
    findMy(userId: string): Promise<{
        currentMonth: {
            status: string;
            amount: number;
            nextPaymentDate: Date | null;
            daysUntilPayment: number | null;
        };
        history: {
            id: string;
            amount: Prisma.Decimal;
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
    uploadReceipt(file: Express.Multer.File, studentId: string, actorId: string): Promise<{
        id: string;
        amount: Prisma.Decimal;
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
    confirm(id: string, actorId: string): Promise<{
        id: string;
        amount: Prisma.Decimal;
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
        amount: Prisma.Decimal;
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
}
