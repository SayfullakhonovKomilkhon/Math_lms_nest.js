import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
declare class CreateStaffDto {
    phone: string;
    password: string;
    role: 'TEACHER' | 'ADMIN';
    fullName?: string;
}
declare class UpdateUserDto {
    phone?: string;
    password?: string;
}
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
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
    createStaff(dto: CreateStaffDto): Promise<{
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivateStaff(id: string, actorId: string): Promise<{
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    getAuditLog(limit?: string, offset?: string, action?: string, userId?: string, from?: string, to?: string): Promise<{
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
    getAuditLogLegacy(limit?: string, offset?: string, action?: string): Promise<{
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
    deactivate(id: string, actorId: string): Promise<{
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    updateUser(id: string, dto: UpdateUserDto, actorId: string): Promise<{
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findOne(id: string): Promise<{
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
