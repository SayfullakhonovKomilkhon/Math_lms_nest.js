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
            monthlyFee: Prisma.Decimal;
        };
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
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
            monthlyFee: Prisma.Decimal;
        };
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        nextPaymentDate: Date | null;
        rejectReason: string | null;
        receiptUrl: string | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
    }[]>;
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
            monthlyFee: Prisma.Decimal;
        };
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        nextPaymentDate: Date | null;
        rejectReason: string | null;
        receiptUrl: string | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
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
                monthlyFee: Prisma.Decimal;
            };
            status: import(".prisma/client").$Enums.PaymentStatus;
            amount: Prisma.Decimal;
            nextPaymentDate: Date | null;
            rejectReason: string | null;
            receiptUrl: string | null;
            confirmedAt: Date | null;
            rejectedAt: Date | null;
        }[];
    }>;
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
            monthlyFee: Prisma.Decimal;
        };
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
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
            monthlyFee: Prisma.Decimal;
        };
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
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
            monthlyFee: Prisma.Decimal;
        };
        status: import(".prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        nextPaymentDate: Date | null;
        rejectReason: string | null;
        receiptUrl: string | null;
        confirmedAt: Date | null;
        rejectedAt: Date | null;
    }>;
    getDebtors(): Promise<{
        studentId: string;
        fullName: string;
        groupName: string;
        monthlyFee: Prisma.Decimal;
        lastPaymentDate: Date | null;
    }[]>;
}
