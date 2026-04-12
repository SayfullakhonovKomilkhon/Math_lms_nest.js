import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
export declare class TeachersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateTeacherDto, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
    findAll(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
    update(id: string, dto: UpdateTeacherDto, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
    deactivate(id: string, actorId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
}
