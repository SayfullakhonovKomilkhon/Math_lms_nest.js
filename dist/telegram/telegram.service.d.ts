import { OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class TelegramService implements OnModuleDestroy {
    private prisma;
    private readonly logger;
    private bot;
    private pendingCodes;
    private readonly CODE_TTL_MS;
    constructor(prisma: PrismaService);
    private setupCommands;
    private tryLinkByCode;
    generateCode(userId: string): string;
    sendMessage(chatId: string, message: string): Promise<void>;
    onModuleDestroy(): void;
}
