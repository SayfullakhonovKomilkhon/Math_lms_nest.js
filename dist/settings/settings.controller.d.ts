import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
export declare class SettingsController {
    private service;
    constructor(service: SettingsService);
    findAll(): Promise<{
        value: string;
        id: string;
        updatedAt: Date;
        key: string;
        label: string | null;
        updatedBy: string | null;
    }[]>;
    getPublicBranding(): Promise<{
        centerName: string;
        centerPhone: string;
        centerAddress: string;
    }>;
    updateMany(dto: UpdateSettingsDto, actorId: string): Promise<{
        value: string;
        id: string;
        updatedAt: Date;
        key: string;
        label: string | null;
        updatedBy: string | null;
    }[]>;
}
