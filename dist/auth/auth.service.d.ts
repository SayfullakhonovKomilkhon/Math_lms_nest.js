import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { UpdateMeDto } from './dto/update-me.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            phone: string;
            role: import(".prisma/client").$Enums.Role;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(userId: string, refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
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
    logout(userId: string, refreshToken?: string): Promise<void>;
    private generateTokens;
    private saveRefreshToken;
}
