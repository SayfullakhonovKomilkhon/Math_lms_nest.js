import { ConfigService } from '@nestjs/config';
export declare class S3Service {
    private config;
    private client;
    private bucket;
    private endpoint;
    constructor(config: ConfigService);
    uploadFile(file: Express.Multer.File, folder: 'receipts' | 'homework' | 'avatars'): Promise<string>;
}
