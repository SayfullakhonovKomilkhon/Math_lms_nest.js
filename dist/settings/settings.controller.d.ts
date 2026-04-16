import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
export declare class SettingsController {
    private service;
    constructor(service: SettingsService);
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
