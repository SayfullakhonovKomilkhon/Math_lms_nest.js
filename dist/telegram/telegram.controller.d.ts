import { TelegramService } from './telegram.service';
import { PrismaService } from '../prisma/prisma.service';
declare class LinkDto {
    linkCode: string;
}
export declare class TelegramController {
    private telegramService;
    private prisma;
    constructor(telegramService: TelegramService, prisma: PrismaService);
    generateCode(): {
        code: string;
        botUsername: string;
    };
    link(dto: LinkDto, req: any): Promise<{
        success: boolean;
    }>;
}
export {};
