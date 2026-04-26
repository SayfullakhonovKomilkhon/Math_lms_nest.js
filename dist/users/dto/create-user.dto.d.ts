import { Role } from '@prisma/client';
export declare class CreateUserDto {
    phone: string;
    password: string;
    role: Role;
    telegramChatId?: string;
}
