import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
export declare class SettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        label: string | null;
        value: string;
        updatedBy: string | null;
    }[]>;
    updateMany(dto: UpdateSettingsDto, actorId: string): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        label: string | null;
        value: string;
        updatedBy: string | null;
    }[]>;
}
