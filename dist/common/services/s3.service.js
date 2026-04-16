"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_TYPE_TO_EXTENSION = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
};
let S3Service = class S3Service {
    constructor(config) {
        this.config = config;
        this.endpoint = this.config.get('s3.endpoint') || 'http://localhost:9000';
        this.bucket = this.config.get('s3.bucket') || 'mathcenter';
        this.client = new client_s3_1.S3Client({
            endpoint: this.endpoint,
            region: this.config.get('s3.region') || 'us-east-1',
            credentials: {
                accessKeyId: this.config.get('s3.accessKey') || 'minioadmin',
                secretAccessKey: this.config.get('s3.secretKey') || 'minioadmin',
            },
            forcePathStyle: true,
        });
    }
    async uploadFile(file, folder) {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException('Недопустимый тип файла. Разрешены: JPG, PNG, WebP, PDF');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new common_1.BadRequestException('Файл слишком большой. Максимальный размер: 10MB');
        }
        const ext = MIME_TYPE_TO_EXTENSION[file.mimetype];
        const key = `${folder}/${(0, uuid_1.v4)()}.${ext}`;
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        }));
        return `${this.endpoint}/${this.bucket}/${key}`;
    }
};
exports.S3Service = S3Service;
exports.S3Service = S3Service = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3Service);
//# sourceMappingURL=s3.service.js.map