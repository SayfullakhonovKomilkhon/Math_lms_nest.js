import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateUserDto): Promise<{
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(role?: string): Promise<{
        teacher: {
            phone: string | null;
            id: string;
            fullName: string;
            ratePerStudent: import("@prisma/client/runtime/library").Decimal;
        } | null;
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        phone: string;
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
            phone: string;
            isActive: boolean;
            ratePerStudent: number;
            studentsCount: number;
            createdAt: Date;
        }[];
        admins: {
            id: string;
            fullName: null;
            phone: string;
            isActive: boolean;
            createdAt: Date;
        }[];
    }>;
    createStaff(dto: {
        phone: string;
        password: string;
        role: 'TEACHER' | 'ADMIN';
        fullName?: string;
    }): Promise<{
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateCredentials(id: string, dto: {
        phone?: string;
        password?: string;
    }, actorId: string): Promise<{
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivate(id: string, actorId: string): Promise<{
        phone: string;
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
                phone: string;
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
