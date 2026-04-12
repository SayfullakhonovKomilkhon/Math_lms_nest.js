import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class S3Service {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(private config: ConfigService) {
    this.endpoint = this.config.get<string>('s3.endpoint') || 'http://localhost:9000';
    this.bucket = this.config.get<string>('s3.bucket') || 'mathcenter';

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: this.config.get<string>('s3.region') || 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('s3.accessKey') || 'minioadmin',
        secretAccessKey: this.config.get<string>('s3.secretKey') || 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: 'receipts' | 'homework' | 'avatars',
  ): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${folder}/${Date.now()}-${uuidv4()}${ext}`;

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
}
