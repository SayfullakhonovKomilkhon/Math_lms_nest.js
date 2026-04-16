export declare class CreatePaymentDto {
    studentId: string;
    amount: number;
    nextPaymentDate?: string;
}
export declare class RejectPaymentDto {
    rejectReason: string;
}
