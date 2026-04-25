import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
export declare class SettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: string;
        label: string | null;
        updatedBy: string | null;
    }[]>;
    getPublicBranding(): Promise<{
        centerName: string;
        centerPhone: string;
        centerAddress: string;
    }>;
    getValue(key: string): Promise<string | null>;
    updateMany(dto: UpdateSettingsDto, actorId: string): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: string;
        label: string | null;
        updatedBy: string | null;
    }[]>;
}
