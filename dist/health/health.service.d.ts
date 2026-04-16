import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class HealthService implements OnModuleDestroy {
    private readonly prisma;
    private readonly configService;
    private readonly redis;
    constructor(prisma: PrismaService, configService: ConfigService);
    getStatus(): Promise<{
        status: string;
        timestamp: string;
        database: "connected" | "disconnected";
        redis: "connected" | "disconnected";
        version: string;
    }>;
    onModuleDestroy(): Promise<void>;
}
