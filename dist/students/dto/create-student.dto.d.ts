import { Gender } from '@prisma/client';
export declare class CreateStudentDto {
    phone: string;
    password: string;
    fullName: string;
    birthDate?: string;
    gender: Gender;
    groupId?: string;
    monthlyFee?: number;
}
