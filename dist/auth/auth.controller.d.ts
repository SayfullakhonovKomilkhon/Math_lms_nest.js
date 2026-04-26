import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UpdateMeDto } from './dto/update-me.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            phone: string;
            role: import(".prisma/client").$Enums.Role;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(dto: RefreshDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, body: Partial<RefreshDto>): Promise<void>;
    getMe(userId: string): Promise<{
        phone: string;
        id: string;
        role: import(".prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
    }>;
    updateMe(userId: string, dto: UpdateMeDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            phone: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
        };
    }>;
    private decodeRefreshToken;
}
