import { OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class TelegramService implements OnModuleDestroy {
    private prisma;
    private readonly logger;
    private bot;
    private pendingCodes;
    constructor(prisma: PrismaService);
    private setupCommands;
    generateCode(): string;
    getChatIdForCode(code: string): string | null;
    consumeCode(code: string): void;
    sendMessage(chatId: string, message: string): Promise<void>;
    onModuleDestroy(): void;
}
