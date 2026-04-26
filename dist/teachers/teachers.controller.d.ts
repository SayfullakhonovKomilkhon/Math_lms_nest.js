import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
export declare class TeachersController {
    private teachersService;
    constructor(teachersService: TeachersService);
    create(dto: CreateTeacherDto, actorId: string): Promise<{
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
    findAll(): Promise<{
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }[]>;
    findOne(id: string): Promise<{
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
    update(id: string, dto: UpdateTeacherDto, actorId: string): Promise<{
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
    deactivate(id: string, actorId: string): Promise<{
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        phone: string | null;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        fullName: string;
        ratePerStudent: import("@prisma/client/runtime/library").Decimal;
    }>;
}
