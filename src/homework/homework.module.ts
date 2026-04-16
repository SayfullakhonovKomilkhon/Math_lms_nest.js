import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HomeworkService } from './homework.service';
import { HomeworkController } from './homework.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'notifications' })],
  controllers: [HomeworkController],
  providers: [HomeworkService],
  exports: [HomeworkService],
})
export class HomeworkModule {}
