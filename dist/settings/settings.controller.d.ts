import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
export declare class SettingsController {
    private service;
    constructor(service: SettingsService);
    findAll(): Promise<{
        id: string;
        updatedAt: Date;
        value: string;
        key: string;
        label: string | null;
        updatedBy: string | null;
    }[]>;
    updateMany(dto: UpdateSettingsDto, actorId: string): Promise<{
        id: string;
        updatedAt: Date;
        value: string;
        key: string;
        label: string | null;
        updatedBy: string | null;
    }[]>;
}
