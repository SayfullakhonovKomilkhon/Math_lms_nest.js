import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { S3Service } from '../common/services/s3.service';

@Module({
  controllers: [ContentController],
  providers: [ContentService, S3Service],
})
export class ContentModule {}
