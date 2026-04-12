import { Module } from '@nestjs/common';
import { LessonTopicsService } from './lesson-topics.service';
import { LessonTopicsController } from './lesson-topics.controller';

@Module({
  controllers: [LessonTopicsController],
  providers: [LessonTopicsService],
  exports: [LessonTopicsService],
})
export class LessonTopicsModule {}
