import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { CreatePaymentDto, RejectPaymentDto } from './dto/create-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
export declare class PaymentsService {
    private prisma;
    private s3;
    constructor(prisma: PrismaService, s3: S3Service);
    create(dto: CreatePaymentDto, actorId: string): Promise<{
        student: {
            group: {
                id: string;
                name: string;
            } | null;
            id: string;
            fullName: string;
            monthlyFee: Prisma.Decimal;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
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
            monthlyFee: Prisma.Decimal;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        receiptUrl: string | null;
        nextPaymentDate: Date | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
        rejectReason: string | null;
    }[]>;
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
            monthlyFee: Prisma.Decimal;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        receiptUrl: string | null;
        nextPaymentDate: Date | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
        rejectReason: string | null;
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
                monthlyFee: Prisma.Decimal;
            };
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: Prisma.Decimal;
            receiptUrl: string | null;
            nextPaymentDate: Date | null;
            confirmedAt: Date | null;
            rejectedAt: Date | null;
            rejectReason: string | null;
        }[];
    }>;
    uploadReceipt(file: Express.Multer.File, studentId: string, actorId: string): Promise<{
        student: {
            group: {
                id: string;
                name: string;
            } | null;
            id: string;
            fullName: string;
            monthlyFee: Prisma.Decimal;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        receiptUrl: string | null;
        nextPaymentDate: Date | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
        rejectReason: string | null;
    }>;
    confirm(id: string, actorId: string): Promise<{
        student: {
            group: {
                id: string;
                name: string;
            } | null;
            id: string;
            fullName: string;
            monthlyFee: Prisma.Decimal;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
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
            monthlyFee: Prisma.Decimal;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        receiptUrl: string | null;
        nextPaymentDate: Date | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
        rejectReason: string | null;
    }>;
    getReceiptUrl(id: string): Promise<{
        url: string;
    }>;
    getDebtors(): Promise<{
        studentId: string;
        fullName: string;
        groupName: string;
        monthlyFee: Prisma.Decimal;
        lastPaymentDate: Date | null;
    }[]>;
}
