import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    create(dto: CreateUserDto): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        telegramChatId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
