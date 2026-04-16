import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';
import { S3Service } from '../common/services/s3.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [HomeworkController],
  providers: [HomeworkService, S3Service],
  exports: [HomeworkService],
})
export class HomeworkModule {}
