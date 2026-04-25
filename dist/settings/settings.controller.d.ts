import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
export declare class SettingsController {
    private service;
    constructor(service: SettingsService);
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
    updateMany(dto: UpdateSettingsDto, actorId: string): Promise<{
        id: string;
        updatedAt: Date;
        key: string;
        value: string;
        label: string | null;
        updatedBy: string | null;
    }[]>;
}
