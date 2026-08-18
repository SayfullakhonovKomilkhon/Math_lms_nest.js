import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

@Injectable()
export class S3Service {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.endpoint =
      this.config.get<string>('s3.endpoint') || 'http://localhost:9000';
    this.bucket = this.config.get<string>('s3.bucket') || 'mathcenter';
    this.publicUrl = (this.config.get<string>('s3.publicUrl') || '').replace(
      /\/$/,
      '',
    );

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: this.config.get<string>('s3.region') || 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('s3.accessKey') || 'minioadmin',
        secretAccessKey:
          this.config.get<string>('s3.secretKey') || 'minioadmin',
      },
      forcePathStyle: this.endpoint.includes('localhost'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: 'receipts' | 'homework' | 'avatars' | 'expenses' | 'content',
    isPublic = false,
  ): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Недопустимый тип файла. Разрешены: JPG, PNG, WebP, GIF, PDF, MP4, WebM, MOV',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'Файл слишком большой. Максимальный размер: 500MB',
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
        CacheControl: isPublic
          ? 'public, max-age=31536000, immutable'
          : undefined,
        ACL: isPublic ? ObjectCannedACL.public_read : undefined,
      }),
    );

    return isPublic ? this.buildPublicUrl(key) : this.buildStorageUrl(key);
  }

  uploadPublicContent(file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, 'content', true);
  }

  async getPresignedUrl(fileUrl: string, expiresIn = 300): Promise<string> {
    // Extract key from full URL: http://endpoint/bucket/key
    const key = this.extractKey(fileUrl);

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Best-effort deletion of a stored object. Errors are swallowed because
   * the calling business logic (e.g. removing a payment) shouldn't fail
   * just because S3 is temporarily unhappy or the file is already gone.
   */
  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKey(fileUrl);
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      // intentionally ignored
    }
  }

  private buildStorageUrl(key: string): string {
    if (this.endpoint.includes('localhost')) {
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    const endpoint = new URL(this.endpoint);
    return `${endpoint.protocol}//${this.bucket}.${endpoint.host}/${key}`;
  }

  private buildPublicUrl(key: string): string {
    return this.publicUrl
      ? `${this.publicUrl}/${key}`
      : this.buildStorageUrl(key);
  }

  private extractKey(fileUrl: string): string {
    const candidates = [
      this.publicUrl ? `${this.publicUrl}/` : '',
      `${this.endpoint}/${this.bucket}/`,
      `${this.endpoint.replace('://', `://${this.bucket}.`)}/`,
    ].filter(Boolean);
    const prefix = candidates.find((item) => fileUrl.startsWith(item));
    return decodeURIComponent(prefix ? fileUrl.slice(prefix.length) : fileUrl);
  }
}
