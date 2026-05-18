export declare class CreatePaymentDto {
    studentId: string;
    amount: number;
    nextPaymentDate?: string;
}
export declare class CreateManualPaymentDto {
    studentId: string;
    amount: number;
    paidAt?: string;
    nextPaymentDate?: string;
}
export declare class RejectPaymentDto {
    rejectReason: string;
}
export declare class UpdatePaymentDto {
    amount?: number;
    paidAt?: string;
    nextPaymentDate?: string;
}
