import { PrismaService } from '../prisma/prisma.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
export declare class ParentsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateParentDto, actorId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
    }>;
    findMyProfile(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
    }>;
    update(id: string, dto: UpdateParentDto, actorId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            id: string;
            fullName: string;
            groupId: string | null;
        };
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
        fullName: string;
        phone: string | null;
    }>;
}
