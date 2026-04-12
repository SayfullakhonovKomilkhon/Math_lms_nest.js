import { Gender } from '@prisma/client';
export declare class CreateStudentDto {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    birthDate?: string;
    gender: Gender;
    groupId?: string;
    monthlyFee?: number;
}
