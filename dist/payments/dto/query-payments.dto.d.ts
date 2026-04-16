import { PaymentStatus } from '@prisma/client';
export declare class QueryPaymentsDto {
    studentId?: string;
    status?: PaymentStatus;
    from?: string;
    to?: string;
    groupId?: string;
}
