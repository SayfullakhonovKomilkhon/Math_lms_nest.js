import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateUserDto): Promise<{
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(role?: string): Promise<{
        teacher: {
            id: string;
            fullName: string;
            phone: string | null;
            ratePerStudent: import("@prisma/client/runtime/library").Decimal;
        } | null;
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getStaff(): Promise<{
        teachers: {
            id: string;
            userId: string;
            fullName: string;
            phone: string | null;
            email: string;
            isActive: boolean;
            ratePerStudent: number;
            studentsCount: number;
            createdAt: Date;
        }[];
        admins: {
            id: string;
            fullName: null;
            email: string;
            isActive: boolean;
            createdAt: Date;
        }[];
    }>;
    createStaff(dto: {
        email: string;
        password: string;
        role: 'TEACHER' | 'ADMIN';
        fullName?: string;
        phone?: string;
    }): Promise<{
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivate(id: string, actorId: string): Promise<{
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    getAuditLog(params: {
        limit: number;
        offset: number;
        action?: string;
        userId?: string;
        from?: string;
        to?: string;
    }): Promise<{
        total: number;
        records: ({
            user: {
                email: string;
                role: import(".prisma/client").$Enums.Role;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            action: string;
            entity: string;
            entityId: string | null;
            details: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
    }>;
}
