import { TelegramService } from './telegram.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class TelegramController {
    private telegramService;
    private prisma;
    constructor(telegramService: TelegramService, prisma: PrismaService);
    generateCode(req: any): {
        code: string;
        botUsername: string;
    };
    status(req: any): Promise<{
        linked: boolean;
    }>;
    unlink(req: any): Promise<{
        success: boolean;
    }>;
}
