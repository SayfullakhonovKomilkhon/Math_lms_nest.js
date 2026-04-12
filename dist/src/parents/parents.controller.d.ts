import { ParentsService } from './parents.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
export declare class ParentsController {
    private parentsService;
    constructor(parentsService: ParentsService);
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
    getMyProfile(userId: string): Promise<{
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
