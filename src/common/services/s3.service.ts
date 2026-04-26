import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

@Injectable()
export class S3Service {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(private config: ConfigService) {
    this.endpoint =
      this.config.get<string>('s3.endpoint') || 'http://localhost:9000';
    this.bucket = this.config.get<string>('s3.bucket') || 'mathcenter';

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: this.config.get<string>('s3.region') || 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('s3.accessKey') || 'minioadmin',
        secretAccessKey:
          this.config.get<string>('s3.secretKey') || 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: 'receipts' | 'homework' | 'avatars' | 'expenses',
  ): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Недопустимый тип файла. Разрешены: JPG, PNG, WebP, PDF',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'Файл слишком большой. Максимальный размер: 10MB',
      );
    }

    const ext = MIME_TYPE_TO_EXTENSION[file.mimetype];
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  async getPresignedUrl(fileUrl: string, expiresIn = 300): Promise<string> {
    // Extract key from full URL: http://endpoint/bucket/key
    const prefix = `${this.endpoint}/${this.bucket}/`;
    const key = fileUrl.startsWith(prefix)
      ? fileUrl.slice(prefix.length)
      : fileUrl;

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
