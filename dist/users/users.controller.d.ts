import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
declare class CreateStaffDto {
    email: string;
    password: string;
    role: 'TEACHER' | 'ADMIN';
    fullName?: string;
    phone?: string;
}
declare class UpdateUserDto {
    email?: string;
    password?: string;
}
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
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
    createStaff(dto: CreateStaffDto): Promise<{
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivateStaff(id: string, actorId: string): Promise<{
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    getAuditLog(limit?: string, offset?: string, action?: string, userId?: string, from?: string, to?: string): Promise<{
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
    getAuditLogLegacy(limit?: string, offset?: string, action?: string): Promise<{
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
    deactivate(id: string, actorId: string): Promise<{
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    updateUser(id: string, dto: UpdateUserDto, actorId: string): Promise<{
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findOne(id: string): Promise<{
        email: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
